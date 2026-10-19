
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWbStats } from "@/lib/wb/calculateStats";
import { getSubscriptionAccess } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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
      .select("id, report_id, report_data")
      .eq("user_id", user.id)
      .limit(1000);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Не удалось получить сохранённые отчёты", details: error.message },
        { status: 500 }
      );
    }

    let recalculated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const report of reports ?? []) {
      const data = report.report_data;

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        skipped++;
        continue;
      }

      const reportData = data as Record<string, unknown>;
      const details = reportData.details;

      if (!Array.isArray(details)) {
        skipped++;
        continue;
      }

      const stats = calculateWbStats(details);

      const { error: updateError } = await supabaseAdmin
        .from("wb_finance_reports")
        .update({
          report_data: {
            ...reportData,
            stats,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("user_id", user.id);

      if (updateError) {
        errors.push(`Отчёт ${report.report_id}: ${updateError.message}`);
        continue;
      }

      recalculated++;
    }

    return NextResponse.json({
      success: errors.length === 0,
      total: reports?.length ?? 0,
      recalculated,
      skipped,
      errors,
      message: "Пересчёт сохранённых отчётов завершён",
    });
  } catch (error) {
    console.error("WB recalculate error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Внутренняя ошибка пересчёта",
      },
      { status: 500 }
    );
  }
}
