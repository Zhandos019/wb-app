import { getUserWbToken } from "@/lib/wbConnection";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubscriptionAccess } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WbReport = {
  reportId: number;
  reportType: number;
  dateFrom: string;
  dateTo: string;
  createDt?: string;
  currency?: string;
  [key: string]: unknown;
};

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
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
    const dateFrom = String(body.dateFrom ?? "");
    const dateTo = String(body.dateTo ?? "");
    const offset = Number(body.offset ?? 0);

    if (
      !Number.isSafeInteger(offset) ||
      offset < 0
    ) {
      return NextResponse.json(
        { error: "Некорректное значение offset" },
        { status: 400 }
      );
    }
    if (
      !isValidDate(dateFrom) ||
      !isValidDate(dateTo) ||
      dateFrom > dateTo
    ) {
      return NextResponse.json(
        { error: "Укажите корректный период dateFrom и dateTo" },
        { status: 400 }
      );
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
    const wbResponse = await fetch(
      "https://finance-api.wildberries.ru/api/finance/v1/sales-reports/list",
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          limit: 1000,
          offset,
          period: "weekly",
        }),
        cache: "no-store",
      }
    );

    if (!wbResponse.ok) {
      const details = await wbResponse.text();
    
      const retryAfter =
        wbResponse.headers.get("X-RateLimit-Retry") ??
        wbResponse.headers.get("Retry-After");
    
      if (wbResponse.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Wildberries ограничил частоту запросов. Повтори попытку после указанного времени ожидания.",
            status: 429,
            retryAfter,
            details: details.slice(0, 1500),
          },
          {
            status: 429,
            headers: retryAfter
              ? { "Retry-After": retryAfter }
              : undefined,
          }
        );
      }
    
      console.error("WB reports list error:", {
        status: wbResponse.status,
        details: details.slice(0, 1500),
      });
    
      return NextResponse.json(
        {
          success: false,
          error: "Wildberries не смог вернуть список отчётов",
          status: wbResponse.status,
          details: details.slice(0, 1500),
        },
        { status: 502 }
      );
    }

    const responseData: unknown = await wbResponse.json();

    const reports: WbReport[] = Array.isArray(responseData)
      ? (responseData as WbReport[])
      : [];

    const relevantReports = reports.filter(
      (report) => report.reportType === 1 || report.reportType === 2
    );

    let saved = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const report of relevantReports) {
      const { data: existing, error: findError } = await supabaseAdmin
        .from("wb_finance_reports")
        .select("report_id, status, report_data, last_rrd_id")
        .eq("user_id", user.id)
        .eq("report_id", report.reportId)
        .maybeSingle();

      if (findError) {
        errors.push(
          `Отчёт ${report.reportId}: ${findError.message}`
        );
        continue;
      }

      let saveError;

      if (existing) {
        // Существующий отчёт: обновляем метаданные,
        // не сбрасывая статус и уже полученные подробные строки.
        const result = await supabaseAdmin
          .from("wb_finance_reports")
          .update({
            report_type: report.reportType,
            date_from: report.dateFrom,
            date_to: report.dateTo,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("report_id", report.reportId);
      
        saveError = result.error;
      } else {
        // Новый отчёт: сохраняем для дальнейшей обработки.
        const result = await supabaseAdmin
          .from("wb_finance_reports")
          .insert({
            user_id: user.id,
            report_id: report.reportId,
            report_type: report.reportType,
            date_from: report.dateFrom,
            date_to: report.dateTo,
            report_data: report,
            status: "pending",
            last_rrd_id: 0,
            updated_at: new Date().toISOString(),
          });
      
        saveError = result.error;
      }
      
      if (saveError) {
        errors.push(`Отчёт ${report.reportId}: ${saveError.message}`);
        continue;
      }

      if (existing) {
        updated++;
      } else {
        saved++;
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      period: { dateFrom, dateTo },
      found: reports.length,
      offset,
      nextOffset: offset + reports.length,
      hasMore: reports.length === 1000,
      relevant: relevantReports.length,
      saved,
      updated,
      errors,
      message:
        "Список отчётов обработан. Подробные строки и финансовые показатели пока не рассчитывались.",
    });
  } catch (error) {
    console.error("WB calculate error:", error);

    return NextResponse.json(
      {
        error: "Внутренняя ошибка при обработке отчётов WB",
        details:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}
