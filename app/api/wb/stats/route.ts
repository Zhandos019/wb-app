
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWbStats } from "@/lib/wb/calculateStats";
import { getSubscriptionAccess } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WbRow = {
  rrDate?: string;
  rr_dt?: string;
  saleDt?: string;
  sale_dt?: string;
  orderDt?: string;
  order_dt?: string;
  [key: string]: unknown;
};

type MonthlyStats = {
  totalSales: number;
  orders: number;
  avgCheck: number;
  profit: number;
  storage: number;
  chart: { name: string; sales: number }[];
  reportIds: number[];
};

function getMonth(row: WbRow, fallbackDate: string): string {
  const rawDate =
    row.rrDate ??
    row.rr_dt ??
    row.saleDt ??
    row.sale_dt ??
    row.orderDt ??
    row.order_dt ??
    fallbackDate;

  const date = String(rawDate).slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.slice(0, 7)
    : fallbackDate.slice(0, 7);
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Необходима авторизация" },
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
    const { data: reports, error } = await supabaseAdmin
      .from("wb_finance_reports")
      .select(
        "report_id, report_type, date_from, date_to, report_data, status"
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("date_from", { ascending: true });

    if (error) {
      console.error("WB stats lookup failed:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Не удалось загрузить статистику Wildberries",
        },
        { status: 500 }
      );
    }

    const rowsByMonth = new Map<string, WbRow[]>();
    const reportIdsByMonth = new Map<string, Set<number>>();
    let reportsWithoutDetails = 0;

    for (const report of reports ?? []) {
      const reportData = report.report_data;

      if (
        !reportData ||
        typeof reportData !== "object" ||
        Array.isArray(reportData)
      ) {
        reportsWithoutDetails++;
        continue;
      }

      const details = (reportData as Record<string, unknown>).details;

      if (!Array.isArray(details)) {
        reportsWithoutDetails++;
        continue;
      }

      for (const rawRow of details) {
        if (!rawRow || typeof rawRow !== "object") continue;

        const row = rawRow as WbRow;
        const month = getMonth(row, report.date_from);

        if (!rowsByMonth.has(month)) {
          rowsByMonth.set(month, []);
          reportIdsByMonth.set(month, new Set<number>());
        }

        rowsByMonth.get(month)!.push(row);
        reportIdsByMonth.get(month)!.add(Number(report.report_id));
      }
    }

    const months: Record<string, MonthlyStats> = {};

    for (const [month, rows] of rowsByMonth.entries()) {
      const stats = calculateWbStats(
        rows as Parameters<typeof calculateWbStats>[0]
      );

      months[month] = {
        ...stats,
        reportIds: [...(reportIdsByMonth.get(month) ?? [])],
      };
    }

    return NextResponse.json({
      success: true,
      reportsFound: reports?.length ?? 0,
      reportsWithoutDetails,
      months,
    });
  } catch (error) {
    console.error("WB stats API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Внутренняя ошибка загрузки статистики WB",
      },
      { status: 500 }
    );
  }
}
