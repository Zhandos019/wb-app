import { getUserWbToken } from "@/lib/wbConnection";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWbStats } from "@/lib/wb/calculateStats";
import { getSubscriptionAccess } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 100000;

type WbRow = {
  rrdId?: number;
  [key: string]: unknown;
};

type SavedReportData = {
  details?: WbRow[];
  stats?: ReturnType<typeof calculateWbStats>;
  [key: string]: unknown;
};
function getRrdId(row: WbRow): number | null {
  const value = row.rrdId ?? row.rrd_id;
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function mergeUniqueRows(
  previousRows: WbRow[],
  newRows: WbRow[]
): WbRow[] {
  const uniqueRows = new Map<string, WbRow>();

  let index = 0;

  for (const row of previousRows) {
    const id = getRrdId(row);
    const key = id === null ? `previous-${index++}` : String(id);

    uniqueRows.set(key, row);
  }

  index = 0;

  for (const row of newRows) {
    const id = getRrdId(row);
    const key = id === null ? `new-${index++}` : String(id);

    uniqueRows.set(key, row);
  }

  return [...uniqueRows.values()];
}
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    const subscription = await getSubscriptionAccess(user.id);

    if (!subscription.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Пробный период завершён или подписка неактивна",
          code: "SUBSCRIPTION_REQUIRED",
          reason: subscription.reason,
          endsAt: subscription.endsAt,
        },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const requestedReportId = body.reportId
      ? Number(body.reportId)
      : null;

    if (
      requestedReportId !== null &&
      (!Number.isSafeInteger(requestedReportId) ||
        requestedReportId <= 0)
    ) {
      return NextResponse.json(
        { error: "Некорректный reportId" },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("wb_finance_reports")
      .select(
        "id, report_id, report_type, report_data, last_rrd_id, status"
      )
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (requestedReportId !== null) {
      query = query.eq("report_id", requestedReportId);
    }

    const { data: report, error: findError } = await query
      .order("report_type", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: "Не удалось найти отчёт", details: findError.message },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json({
        success: true,
        message: "Нет ожидающих обработки отчётов",
      });
    }

    let token: string | null;

try {
  token = await getUserWbToken(user.id);
} catch {
  return NextResponse.json(
    { error: "Не удалось получить подключение Wildberries" },
    { status: 500 }
  );
}

if (!token) {
  return NextResponse.json(
    {
      error:
        "Wildberries не подключён. Сначала подключите токен в настройках.",
    },
    { status: 400 }
  );
}

    const previousData =
      report.report_data &&
      typeof report.report_data === "object" &&
      !Array.isArray(report.report_data)
        ? (report.report_data as SavedReportData)
        : {};

    const previousRows = Array.isArray(previousData.details)
      ? previousData.details
      : [];

    const cursor = Number(report.last_rrd_id ?? 0);

    const wbResponse = await fetch(
      `https://finance-api.wildberries.ru/api/finance/v1/sales-reports/detailed/${report.report_id}`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: PAGE_LIMIT,
          rrdId: cursor,
        }),
        cache: "no-store",
      }
    );

    if (wbResponse.status === 429) {
      return NextResponse.json(
        {
          error: "Wildberries ограничил частоту запросов",
          retryAfter:
            wbResponse.headers.get("X-RateLimit-Retry") ??
            wbResponse.headers.get("Retry-After"),
          reportId: report.report_id,
        },
        { status: 429 }
      );
    }

    if (wbResponse.status === 204) {
      const stats = calculateWbStats(
        previousRows as Parameters<typeof calculateWbStats>[0]
      );

      const { error: saveError } = await supabaseAdmin
        .from("wb_finance_reports")
        .update({
          report_data: { ...previousData, details: previousRows, stats },
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json(
          { error: "Не удалось сохранить результат", details: saveError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        reportId: report.report_id,
        reportType: report.report_type,
        rowsReceived: 0,
        totalRows: previousRows.length,
        status: "completed",
        stats,
      });
    }

    if (!wbResponse.ok) {
      const details = await wbResponse.text();

      return NextResponse.json(
        {
          error: "Не удалось получить подробные строки Wildberries",
          status: wbResponse.status,
          details: details.slice(0, 1500),
          reportId: report.report_id,
        },
        { status: 502 }
      );
    }

    const responseData: unknown = await wbResponse.json();

    if (!Array.isArray(responseData)) {
      return NextResponse.json(
        {
          error: "Wildberries вернул ответ неожиданного формата",
          reportId: report.report_id,
        },
        { status: 502 }
      );
    }

    const newRows = responseData as WbRow[];

    if (newRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Wildberries вернул пустой ответ 200. Ожидался ответ 204 для завершения отчёта.",
          reportId: report.report_id,
          cursor,
        },
        { status: 502 }
      );
    }
    
    const lastRrdId = getRrdId(newRows[newRows.length - 1]);
    
    if (lastRrdId === null || lastRrdId <= cursor) {
      return NextResponse.json(
        {
          error:
            "Не удалось определить следующий rrdId по последней строке ответа WB.",
          reportId: report.report_id,
          cursor,
          lastRrdId,
        },
        { status: 502 }
      );
    }
    
    const allRows = mergeUniqueRows(previousRows, newRows);
    
    // РћС‚РІРµС‚ 200 РѕР·РЅР°С‡Р°РµС‚, С‡С‚Рѕ СЃРѕС…СЂР°РЅСЏРµРј СЃС‚СЂР°РЅРёС†Сѓ Рё РїСЂРѕРґРѕР»Р¶Р°РµРј.
    // Р—Р°РІРµСЂС€РµРЅРёРµ РѕС‚С‡С‘С‚Р° РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ С‚РѕР»СЊРєРѕ РѕС‚РІРµС‚РѕРј 204.
    const nextCursor = lastRrdId;
    const hasMore = true;
    
    const nextData: SavedReportData = {
      ...previousData,
      details: allRows,
    };

    const { error: saveError } = await supabaseAdmin
      .from("wb_finance_reports")
      .update({
        report_data: nextData,
        last_rrd_id: nextCursor,
        status: hasMore ? "pending" : "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .eq("user_id", user.id);

    if (saveError) {
      return NextResponse.json(
        {
          error: "Не удалось сохранить подробные операции",
          details: saveError.message,
          reportId: report.report_id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: report.report_id,
      reportType: report.report_type,
      rowsReceived: newRows.length,
      totalRows: allRows.length,
      status: hasMore ? "pending" : "completed",
      nextCursor: hasMore ? nextCursor : null,
      stats: null,
      message: hasMore
        ? "Получена страница операций. Для продолжения потребуется следующий запрос."
        : "Отчёт обработан, показатели рассчитаны и сохранены.",
    });
  } catch (error) {
    console.error("WB process error:", error);

    return NextResponse.json(
      {
        error: "Внутренняя ошибка обработки отчёта",
        details:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}

