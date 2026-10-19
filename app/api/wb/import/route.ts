
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserWbToken } from "@/lib/wbConnection";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWbStats } from "@/lib/wb/calculateStats";
import { getSubscriptionAccess } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 1000;
const DETAIL_LIMIT = 100000;
const START_DATE = "2025-01-01";
const WAIT_SECONDS = 60;

type WbRow = {
  rrdId?: number;
  rrd_id?: number;
  [key: string]: unknown;
};

type WbReport = {
  reportId: number;
  reportType: number;
  dateFrom: string;
  dateTo: string;
  [key: string]: unknown;
};

function getRrdId(row: WbRow): number | null {
  const id = Number(row.rrdId ?? row.rrd_id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getRetrySeconds(response: Response): number {
  const raw =
    response.headers.get("X-Ratelimit-Retry") ??
    response.headers.get("Retry-After");

  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : WAIT_SECONDS;
}

function addSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

async function getContext() {
  const user = await getAuthUser();

  if (!user) {
    return {
      response: jsonError("Необходима авторизация.", 401),
    };
  }

  const subscription = await getSubscriptionAccess(user.id);

  if (!subscription.allowed) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Требуется активная подписка.",
          code: "SUBSCRIPTION_REQUIRED",
          reason: subscription.reason,
          endsAt: subscription.endsAt,
        },
        { status: 403 }
      ),
    };
  }

  let token: string | null;

  try {
    token = await getUserWbToken(user.id);
  } catch {
    return {
      response: jsonError(
        "Не удалось получить подключение Wildberries.",
        500
      ),
    };
  }

  if (!token) {
    return {
      response: jsonError(
        "Сначала подключите токен Wildberries в настройках.",
        400
      ),
    };
  }

  return { user, token };
}

async function getJob(userId: number) {
  return supabaseAdmin
    .from("wb_import_jobs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

async function saveJob(userId: number, values: Record<string, unknown>) {
  return supabaseAdmin
    .from("wb_import_jobs")
    .upsert(
      {
        user_id: userId,
        ...values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return jsonError("Необходима авторизация.", 401);
    }

    const subscription = await getSubscriptionAccess(user.id);

    if (!subscription.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Требуется активная подписка.",
          code: "SUBSCRIPTION_REQUIRED",
          reason: subscription.reason,
          endsAt: subscription.endsAt,
        },
        { status: 403 }
      );
    }

    const { data, error } = await getJob(user.id);

    if (error) {
      console.error("WB import job lookup failed:", error.message);
      return jsonError("Не удалось получить состояние импорта.", 500);
    }

    return NextResponse.json({
      success: true,
      job: data ?? null,
    });
  } catch (error) {
    console.error("WB import status failed:", error);
    return jsonError("Внутренняя ошибка получения состояния.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext();

    if ("response" in context) {
      return context.response;
    }

    const { user, token } = context;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "start") {
      const { data: current, error: readError } = await getJob(user.id);

      if (readError) {
        return jsonError("Не удалось проверить текущий импорт.", 500);
      }

      if (current?.status === "running") {
        return NextResponse.json({
          success: true,
          job: current,
          message: "Импорт уже выполняется.",
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      const { data: job, error } = await saveJob(user.id, {
        status: "running",
        phase: "reports",
        date_from: START_DATE,
        date_to: today,
        total_reports: 0,
        processed_reports: 0,
        total_rows: 0,
        processed_rows: 0,
        current_report_id: null,
        next_run_at: new Date().toISOString(),
        retry_after_seconds: null,
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        list_offset: 0,
      });

      if (error) {
        console.error("WB import start failed:", error.message);
        return jsonError("Не удалось запустить импорт.", 500);
      }

      return NextResponse.json({ success: true, job });
    }

    if (action !== "step") {
      return jsonError("Неизвестное действие импорта.", 400);
    }

    const { data: job, error: jobError } = await getJob(user.id);

    if (jobError) {
      return jsonError("Не удалось получить состояние импорта.", 500);
    }

    if (!job || job.status !== "running") {
      return NextResponse.json({
        success: true,
        finished: true,
        job: job ?? null,
        message: "Активный импорт отсутствует.",
      });
    }

    const nextRunAt = job.next_run_at
      ? new Date(job.next_run_at).getTime()
      : 0;

    if (nextRunAt > Date.now()) {
      const waitSeconds = Math.ceil((nextRunAt - Date.now()) / 1000);

      return NextResponse.json({
        success: true,
        waiting: true,
        waitSeconds,
        job,
      });
    }

    const now = new Date().toISOString();

    if (job.phase === "reports") {
      const offset = Number(job.list_offset ?? 0);

      const response = await fetch(
        "https://finance-api.wildberries.ru/api/finance/v1/sales-reports/list",
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateFrom: job.date_from,
            dateTo: job.date_to,
            limit: LIST_LIMIT,
            offset,
            period: "weekly",
          }),
          cache: "no-store",
        }
      );

      if (response.status === 429) {
        const retry = getRetrySeconds(response);
        const { data: updated, error } = await saveJob(user.id, {
          next_run_at: addSeconds(retry),
          retry_after_seconds: retry,
          error_message: null,
        });

        if (error) {
          return jsonError("Не удалось сохранить ожидание лимита WB.", 500);
        }

        return NextResponse.json({
          success: true,
          waiting: true,
          waitSeconds: retry,
          job: updated,
        });
      }

      if (!response.ok) {
        const details = (await response.text()).slice(0, 1000);

        await saveJob(user.id, {
            status: "error",
            next_run_at: null,
            retry_after_seconds: null,
            error_message: `Ошибка списка WB: HTTP ${response.status}. ${details}`,
          });

        return NextResponse.json(
          {
            success: false,
            error: "Wildberries не вернул список отчётов.",
            status: response.status,
            details,
          },
          { status: 502 }
        );
      }
      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        const message = "Не удалось разобрать JSON списка отчётов WB.";
      
        await saveJob(user.id, {
          status: "error",
          next_run_at: null,
          retry_after_seconds: null,
          error_message: message,
        });
      
        return jsonError(message, 502);
      }
      
      if (!Array.isArray(payload)) {
        const message = "WB вернул неожиданный формат списка отчётов.";
      
        await saveJob(user.id, {
          status: "error",
          next_run_at: null,
          retry_after_seconds: null,
          error_message: message,
        });
      
        return jsonError(message, 502);
      }
      
      const reports = payload as WbReport[];

      let saved = 0;

      for (const report of reports) {
        if (
          !Number.isSafeInteger(Number(report.reportId)) ||
          ![1, 2].includes(Number(report.reportType))
        ) {
          continue;
        }

        const reportId = Number(report.reportId);

        const { data: existing, error: findError } = await supabaseAdmin
          .from("wb_finance_reports")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("report_id", reportId)
          .maybeSingle();

        if (findError) {
          return jsonError(
            `Не удалось проверить отчёт ${reportId}: ${findError.message}`,
            500
          );
        }

        if (existing) {
          const { error } = await supabaseAdmin
            .from("wb_finance_reports")
            .update({
              report_type: report.reportType,
              date_from: report.dateFrom,
              date_to: report.dateTo,
              updated_at: now,
            })
            .eq("user_id", user.id)
            .eq("report_id", reportId);

          if (error) {
            return jsonError(
              `Не удалось обновить отчёт ${reportId}: ${error.message}`,
              500
            );
          }
        } else {
          const { error } = await supabaseAdmin
            .from("wb_finance_reports")
            .insert({
              user_id: user.id,
              report_id: reportId,
              report_type: report.reportType,
              date_from: report.dateFrom,
              date_to: report.dateTo,
              report_data: report,
              status: "pending",
              last_rrd_id: 0,
              updated_at: now,
            });

          if (error) {
            return jsonError(
              `Не удалось сохранить отчёт ${reportId}: ${error.message}`,
              500
            );
          }

          saved++;
        }
      }

      const relevantCount = reports.filter(
        (report) => [1, 2].includes(Number(report.reportType))
      ).length;

      const totalReports = Number(job.total_reports ?? 0) + relevantCount;
      const hasMore = reports.length === LIST_LIMIT;

      const { data: updated, error: updateError } = await saveJob(user.id, {
        phase: hasMore ? "reports" : "details",
        list_offset: offset + reports.length,
        total_reports: totalReports,
        next_run_at: addSeconds(WAIT_SECONDS),
        retry_after_seconds: WAIT_SECONDS,
        error_message: null,
      });

      if (updateError) {
        return jsonError("Не удалось сохранить прогресс списка.", 500);
      }

      return NextResponse.json({
        success: true,
        waiting: true,
        waitSeconds: WAIT_SECONDS,
        phase: updated.phase,
        found: reports.length,
        relevant: relevantCount,
        saved,
        offset,
        nextOffset: offset + reports.length,
        job: updated,
        message: hasMore
          ? "Страница списка сохранена. Следующая страница будет загружена после паузы."
          : "Список отчётов загружен. Далее начнётся обработка детализаций.",
      });
    }

    if (job.phase === "details") {
      const { data: report, error: reportError } = await supabaseAdmin
        .from("wb_finance_reports")
        .select("id, report_id, report_type, report_data, last_rrd_id, date_from")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("report_type", { ascending: true })
        .order("date_from", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (reportError) {
        return jsonError("Не удалось найти ожидающий отчёт.", 500);
      }

      if (!report) {
        const { data: completed, error: countError } = await supabaseAdmin
          .from("wb_finance_reports")
          .select("report_id")
          .eq("user_id", user.id)
          .eq("status", "completed");

        if (countError) {
          return jsonError("Не удалось проверить завершённые отчёты.", 500);
        }

        const completedCount = completed?.length ?? 0;

        const { data: finishedJob, error: finishError } = await saveJob(user.id, {
          status: "completed",
          phase: "completed",
          processed_reports: completedCount,
          next_run_at: null,
          retry_after_seconds: null,
          error_message: null,
          completed_at: now,
        });

        if (finishError) {
          return jsonError("Не удалось сохранить завершение импорта.", 500);
        }

        return NextResponse.json({
          success: true,
          finished: true,
          job: finishedJob,
          message: "Импорт завершён.",
        });
      }

      const previousData =
        report.report_data &&
        typeof report.report_data === "object" &&
        !Array.isArray(report.report_data)
          ? (report.report_data as Record<string, unknown>)
          : {};

      const previousRows = Array.isArray(previousData.details)
        ? (previousData.details as WbRow[])
        : [];

      const cursor = Number(report.last_rrd_id ?? 0);

      const response = await fetch(
        `https://finance-api.wildberries.ru/api/finance/v1/sales-reports/detailed/${report.report_id}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: DETAIL_LIMIT,
            rrdId: cursor,
          }),
          cache: "no-store",
        }
      );

      if (response.status === 429) {
        const retry = getRetrySeconds(response);
        const { data: updated, error } = await saveJob(user.id, {
          current_report_id: report.report_id,
          next_run_at: addSeconds(retry),
          retry_after_seconds: retry,
          error_message: null,
        });

        if (error) {
          return jsonError("Не удалось сохранить ожидание лимита WB.", 500);
        }

        return NextResponse.json({
          success: true,
          waiting: true,
          waitSeconds: retry,
          job: updated,
        });
      }

      if (response.status === 204) {
        const stats = calculateWbStats(
          previousRows as Parameters<typeof calculateWbStats>[0]
        );

        const { error: saveError } = await supabaseAdmin
          .from("wb_finance_reports")
          .update({
            report_data: {
              ...previousData,
              details: previousRows,
              stats,
            },
            status: "completed",
            error_message: null,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("id", report.id);

        if (saveError) {
          return jsonError(
            `Не удалось завершить отчёт ${report.report_id}.`,
            500
          );
        }

        const { data: completedReports, error: countError } =
          await supabaseAdmin
            .from("wb_finance_reports")
            .select("report_id")
            .eq("user_id", user.id)
            .eq("status", "completed");

        if (countError) {
          return jsonError("Не удалось обновить прогресс импорта.", 500);
        }

        const { data: updated, error: updateError } = await saveJob(user.id, {
          processed_reports: completedReports?.length ?? 0,
          current_report_id: report.report_id,
          next_run_at: addSeconds(WAIT_SECONDS),
          retry_after_seconds: WAIT_SECONDS,
          processed_rows: Number(job.processed_rows ?? 0) ,
          total_rows: Number(job.total_rows ?? 0) ,
          error_message: null,
        });

        if (updateError) {
          return jsonError("Не удалось сохранить прогресс импорта.", 500);
        }

        return NextResponse.json({
          success: true,
          waiting: true,
          waitSeconds: WAIT_SECONDS,
          reportId: report.report_id,
          status: "completed",
          rows: previousRows.length,
          job: updated,
          message: "Отчёт завершён. Следующий шаг продолжится после паузы.",
        });
      }

      if (!response.ok) {
        const details = (await response.text()).slice(0, 1000);

        const message =
        `Ошибка детализации отчёта ${report.report_id}: HTTP ${response.status}. ${details}`;
      
      await saveJob(user.id, {
        status: "error",
        current_report_id: report.report_id,
        next_run_at: null,
        retry_after_seconds: null,
        error_message: message,
      });

        return NextResponse.json(
          {
            success: false,
            error: "Не удалось получить детализацию отчёта WB.",
            status: response.status,
            details,
            reportId: report.report_id,
          },
          { status: 502 }
        );
      }

      const payload: unknown = await response.json();

      if (!Array.isArray(payload)) {
        const message = "WB вернул неожиданный формат детализации.";
      
        await saveJob(user.id, {
          status: "error",
          current_report_id: report.report_id,
          next_run_at: null,
          retry_after_seconds: null,
          error_message: message,
        });
      
        return jsonError(message, 502);
      }

      const newRows = payload as WbRow[];

      if (newRows.length === 0) {
        const message =
          "WB вернул пустой ответ 200 вместо 204. Импорт остановлен для проверки.";
      
        await saveJob(user.id, {
          status: "error",
          current_report_id: report.report_id,
          next_run_at: null,
          retry_after_seconds: null,
          error_message: message,
        });
      
        return jsonError(message, 502);
      }

      const lastRrdId = getRrdId(newRows[newRows.length - 1]);

      if (lastRrdId === null || lastRrdId <= cursor) {
        const message =
          "Не удалось определить следующий rrdId по последней строке WB.";
      
        await saveJob(user.id, {
          status: "error",
          current_report_id: report.report_id,
          next_run_at: null,
          retry_after_seconds: null,
          error_message: message,
        });
      
        return jsonError(message, 502);
      }

      const unique = new Map<string, WbRow>();
      let index = 0;

      for (const row of [...previousRows, ...newRows]) {
        const id = getRrdId(row);
        const key = id === null ? `row-${index++}` : String(id);
        unique.set(key, row);
      }

      const allRows = [...unique.values()];

      const { error: saveError } = await supabaseAdmin
        .from("wb_finance_reports")
        .update({
          report_data: {
            ...previousData,
            details: allRows,
          },
          last_rrd_id: lastRrdId,
          status: "pending",
          error_message: null,
          updated_at: now,
        })
        .eq("user_id", user.id)
        .eq("id", report.id);

      if (saveError) {
        return jsonError(
          `Не удалось сохранить операции отчёта ${report.report_id}.`,
          500
        );
      }

      const { data: updated, error: updateError } = await saveJob(user.id, {
        current_report_id: report.report_id,
        next_run_at: addSeconds(WAIT_SECONDS),
        retry_after_seconds: WAIT_SECONDS,
        processed_rows: Number(job.processed_rows ?? 0) + newRows.length,
        total_rows: Number(job.total_rows ?? 0) + newRows.length,
        error_message: null,
      });

      if (updateError) {
        return jsonError("Не удалось сохранить прогресс импорта.", 500);
      }

      return NextResponse.json({
        success: true,
        waiting: true,
        waitSeconds: WAIT_SECONDS,
        reportId: report.report_id,
        rowsReceived: newRows.length,
        totalRowsInReport: allRows.length,
        nextCursor: lastRrdId,
        job: updated,
        message: "Страница сохранена. Импорт продолжится после паузы.",
      });
    }

    return jsonError(`Неизвестная фаза импорта: ${job.phase}`, 500);
  } catch (error) {
    console.error("WB import API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Внутренняя ошибка импорта WB.",
      },
      { status: 500 }
    );
  }
}


