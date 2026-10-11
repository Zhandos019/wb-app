
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ReportType = "buyout" | "main";

type DashboardStats = {
  totalSales: number;
  orders: number;
  avgCheck: number;
  profit: number;
  chart: { name: string; sales: number }[];
  storage: number;
};

function isValidStats(value: unknown): value is DashboardStats {
  if (!value || typeof value !== "object") return false;

  const stats = value as Record<string, unknown>;

  const numericFields = [
    "totalSales",
    "orders",
    "avgCheck",
    "profit",
    "storage",
  ];

  if (
    !numericFields.every(
      (field) =>
        typeof stats[field] === "number" &&
        Number.isFinite(stats[field])
    )
  ) {
    return false;
  }

  return (
    Array.isArray(stats.chart) &&
    stats.chart.length <= 100 &&
    stats.chart.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        typeof item.sales === "number" &&
        Number.isFinite(item.sales)
    )
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
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

    const { data, error } = await supabaseAdmin
      .from("report_periods")
      .select(
        "id, period_start, period_end, buyout_file_name, buyout_stats, main_file_name, main_stats, updated_at"
      )
      .eq("user_id", user.id)
      .order("period_start", { ascending: true });

    if (error) {
      console.error("Reports lookup failed:", error.message);

      return NextResponse.json(
        { success: false, error: "Не удалось загрузить отчёты" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reports: data ?? [] });
  } catch (error) {
    console.error("Reports GET failed:", error);

    return NextResponse.json(
      { success: false, error: "Ошибка загрузки отчётов" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const periodStart = body.periodStart;
    const periodEnd = body.periodEnd;
    const reportType = body.reportType as ReportType;
    const fileName = body.fileName;
    const stats = body.stats;

    if (
      !isValidDate(periodStart) ||
      !isValidDate(periodEnd) ||
      periodEnd < periodStart
    ) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный период" },
        { status: 400 }
      );
    }

    if (reportType !== "buyout" && reportType !== "main") {
      return NextResponse.json(
        { success: false, error: "Неизвестный тип отчёта" },
        { status: 400 }
      );
    }

    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      fileName.length > 255
    ) {
      return NextResponse.json(
        { success: false, error: "Некорректное имя файла" },
        { status: 400 }
      );
    }

    if (!isValidStats(stats)) {
      return NextResponse.json(
        { success: false, error: "Данные отчёта имеют неверный формат" },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("report_periods")
      .select("id")
      .eq("user_id", user.id)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();

    if (lookupError) {
      console.error("Report lookup failed:", lookupError.message);

      return NextResponse.json(
        { success: false, error: "Не удалось проверить период" },
        { status: 500 }
      );
    }

    const reportFields =
      reportType === "buyout"
        ? {
            buyout_file_name: fileName.trim(),
            buyout_stats: stats,
          }
        : {
            main_file_name: fileName.trim(),
            main_stats: stats,
          };

    const query = existing
      ? supabaseAdmin
          .from("report_periods")
          .update({
            ...reportFields,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("user_id", user.id)
      : supabaseAdmin.from("report_periods").insert({
          user_id: user.id,
          period_start: periodStart,
          period_end: periodEnd,
          ...reportFields,
        });

    const { error: saveError } = await query;

    if (saveError) {
      console.error("Report save failed:", saveError.message);

      return NextResponse.json(
        { success: false, error: "Не удалось сохранить отчёт" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reports POST failed:", error);

    return NextResponse.json(
      { success: false, error: "Ошибка сохранения отчёта" },
      { status: 500 }
    );
  }
}
