
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MonthlySalesChart } from "@/components/dashboard/MonthlySalesChart";
type WbMonthlyStats = {
  totalSales: number;
  orders: number;
  avgCheck: number;
  profit: number;
  storage: number;
  chart: { name: string; sales: number }[];
  reportIds: number[];
};


function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value) + " ₸";
}

function monthLabel(month: string, withYear = false) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("ru-RU", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}
type WbImportJob = {
  status: string;
  phase: string;
  total_reports: number;
  processed_reports: number;
  total_rows: number;
  processed_rows: number;
  next_run_at: string | null;
  retry_after_seconds: number | null;
  error_message: string | null;
};
export default function DashboardPage() {
  const currentMonth = getCurrentMonth();
  const currentYear = Number(currentMonth.slice(0, 4));
  const [wbMonths, setWbMonths] = useState<Record<string, WbMonthlyStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [notice, setNotice] = useState<string | null>(null);
const [refreshing, setRefreshing] = useState(false);
const [importJob, setImportJob] = useState<WbImportJob | null>(null);
const [importWait, setImportWait] = useState(0);
const importLoopRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [wbConnected, setWbConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;

   
    async function loadReports() {
      try {
        const response = await fetch("/api/wb/stats", {
          cache: "no-store",
        });
    
        const result = await response.json();
    
        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Не удалось загрузить статистику WB"
          );
        }
    
        if (!cancelled) {
          setWbMonths(result.months ?? {});
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Ошибка загрузки статистики WB"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadWbConnection() {
      try {
        const response = await fetch("/api/wb/connection", {
          cache: "no-store",
        });

        if (!response.ok) {
          setWbConnected(false);
          return;
        }

        const result = await response.json();
        setWbConnected(result.connected === true);
      } catch {
        setWbConnected(false);
      }
    }

    void loadWbConnection();
    void loadReports();
    return () => {
      cancelled = true;
    };
  }, []);

 

  
  const waitForSeconds = async (seconds: number) => {
    const endAt = Date.now() + Math.max(1, seconds) * 1000;

    while (Date.now() < endAt && importLoopRef.current) {
      const remaining = Math.ceil((endAt - Date.now()) / 1000);
      setImportWait(remaining);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setImportWait(0);
  };

  async function refreshWbStats() {
    const response = await fetch("/api/wb/stats", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Не удалось обновить статистику WB.");
    }

    setWbMonths(result.months ?? {});
  }

  async function runWbImport(startNew: boolean) {
    if (importLoopRef.current) return;
  
    try {
      const connectionResponse = await fetch("/api/wb/connection", {
        cache: "no-store",
      });
  
      const connection = await connectionResponse.json();
  
      if (!connectionResponse.ok || connection.connected !== true) {
        setWbConnected(false);
        setNotice("Сначала подключите токен Wildberries, чтобы загрузить историю.");
        return;
      }
  
      setWbConnected(true);
    } catch {
      setNotice("Не удалось проверить подключение Wildberries. Попробуйте ещё раз.");
      return;
    }

    importLoopRef.current = true;
    setRefreshing(true);
    setError(null);
    setNotice(null);
    setImportWait(0);

    try {
      let response: Response;
      let result: any;

      if (startNew) {
        response = await fetch("/api/wb/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Не удалось запустить импорт WB.");
        }
      } else {
        response = await fetch("/api/wb/import", {
          cache: "no-store",
        });

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Не удалось получить состояние импорта.");
        }

        if (result.job?.status !== "running") {
          setImportJob(result.job ?? null);
          return;
        }
      }

      if (result.job) setImportJob(result.job);

      while (importLoopRef.current) {
        response = await fetch("/api/wb/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "step" }),
        });

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              `Ошибка импорта WB (${response.status}). Попробуйте продолжить позже.`
          );
        }

        if (result.job) {
          setImportJob(result.job);
        }

        if (result.finished || result.job?.status === "completed") {
          await refreshWbStats();
          setNotice("Импорт истории Wildberries завершён. Статистика обновлена.");
          break;
        }

        if (result.waiting) {
          const wait = Math.max(
            1,
            Number(result.waitSeconds) ||
              Number(result.job?.retry_after_seconds) ||
              60
          );

          if (result.job) setImportJob(result.job);

          await waitForSeconds(wait);
          continue;
        }

        if (result.job?.status !== "running") {
          setNotice("Импорт остановлен: активных задач нет.");
          break;
        }

        // Обновляем месячную статистику после каждого шага.
        await refreshWbStats();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось выполнить импорт WB."
      );
    } finally {
      importLoopRef.current = false;
      setRefreshing(false);
      setImportWait(0);

      try {
        const response = await fetch("/api/wb/import", {
          cache: "no-store",
        });
        const result = await response.json();

        if (response.ok && result.success) {
          setImportJob(result.job ?? null);
        }
      } catch {
        // Состояние импорта сохранено в базе данных.
      }
    }
  }

  async function handleWbImport() {
    await runWbImport(true);
  }

  async function resumeWbImport() {
    await runWbImport(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreImport() {
      try {
        const response = await fetch("/api/wb/import", {
          cache: "no-store",
        });
        const result = await response.json();

        if (cancelled || !response.ok || !result.success) return;

        setImportJob(result.job ?? null);

        if (
          result.job?.status === "running" &&
          !result.job?.error_message
        ) {
          void runWbImport(false);
        }
      } catch {
        // Состояние можно проверить повторно кнопкой импорта.
      }
    }

    void restoreImport();

    return () => {
      cancelled = true;
    };
  }, []);

  
  const monthlySales = useMemo(() => {
    return Object.entries(wbMonths)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => ({
        month,
        name: new Date(`${month}-01T12:00:00`).toLocaleDateString(
          "ru-RU",
          {
            month: "short",
            year: "numeric",
          }
        ),
        sales: stats.totalSales,
      }));
  }, [wbMonths]);
 
  const months = useMemo(() => {
    const result: string[] = [];
    const start = new Date(2025, 0, 1);
    const current = new Date(currentYear, Number(currentMonth.slice(5, 7)) - 1, 1);

    for (
      let date = new Date(start);
      date <= current;
      date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    ) {
      result.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      );
    }

    return result;
  }, [currentMonth, currentYear]);


  const years = [...new Set(months.map((month) => Number(month.slice(0, 4))))].sort(
    (a, b) => b - a
  );

  return (
    <DashboardShell>
     
<header className="mb-8">
  

<div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onClick={() => void handleWbImport()}
      disabled={refreshing}
      className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {refreshing
        ? "Импорт выполняется..."
        : importJob?.status === "running"
          ? "Продолжить импорт истории"
          : "Загрузить всю историю"}
    </button>

    {importJob?.status === "completed" && (
      <span className="text-sm text-emerald-700">
        История загружена
      </span>
    )}
  </div>


</header>
{wbConnected === false && (
  <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <h2 className="font-semibold text-slate-900">
      Подключите Wildberries
    </h2>
    <p className="mt-1 text-sm text-slate-600">
      Чтобы загружать продажи и анализировать показатели, сначала подключите API-токен своего кабинета.
    </p>
    <Link
      href="/dashboard/connection"
      className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
    >
      Подключить Wildberries
    </Link>
  </div>
)}
{importJob && (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">
          Загрузка истории Wildberries
        </h2>
        <span className="text-sm text-slate-500">
          {importJob.status === "completed"
            ? "Завершено"
            : importJob.status === "running"
              ? "В процессе"
              : importJob.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Этап:{" "}
        {importJob.phase === "list"
          ? "Получение списка отчётов"
          : importJob.phase === "details"
            ? "Загрузка операций отчётов"
            : importJob.phase === "completed"
              ? "Импорт завершён"
              : importJob.phase}
      </p>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          Обработано отчётов:{" "}
          <strong>{importJob.processed_reports}</strong>
          {importJob.total_reports > 0
            ? ` из ${importJob.total_reports}`
            : ""}
        </p>
        <p>
          Сохранено строк операций:{" "}
          <strong>{importJob.processed_rows}</strong>
        </p>
      </div>

      {importJob.total_reports > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{
              width: `${Math.min(
                100,
                (importJob.processed_reports / importJob.total_reports) * 100
              )}%`,
            }}
          />
        </div>
      )}

      {refreshing && importWait > 0 && (
        <p className="mt-3 text-sm text-amber-700">
          Следующий запрос через {importWait} сек.
        </p>
      )}

      {importJob.error_message && (
        <p className="mt-3 text-sm text-red-600">
          Последняя ошибка: {importJob.error_message}
        </p>
      )}
    </section>
  )}

       
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
{notice && (
  <div
    role="status"
    className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
  >
    {notice}
  </div>
)}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Динамика продаж по месяцам
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">
  Динамика продаж по обработанным отчётам Wildberries API.
</p>

        {loading ? (
          <p className="py-8 text-sm text-slate-500">Загружаем данные...</p>
        ) : monthlySales.length > 0 ? (
          <MonthlySalesChart data={monthlySales} selectedMonth={currentMonth} />
        ) : (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
           <p className="text-sm text-slate-600">
  Пока нет обработанных отчётов WB. После обработки данных здесь появится динамика по месяцам.
</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
  Аналитика по месяцам
</h2>
<p className="mt-1 text-sm text-slate-500">
  Выберите год и месяц для просмотра статистики Wildberries.
</p>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50"
        >
          <span>
            <span className="block text-xs text-slate-500">Выбор периода</span>
            <span className="mt-1 block font-semibold text-slate-900">
              Выберите год и месяц
            </span>
          </span>
          <span className="text-violet-600">{pickerOpen ? "▲" : "▼"}</span>
        </button>

        

        {pickerOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">1. Выберите год</h3>

            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    selectedYear === year
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            <h3 className="mb-3 mt-5 text-sm font-semibold text-slate-700">2. Выберите месяц</h3>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {months
                .filter((month) => Number(month.slice(0, 4)) === selectedYear)
                .sort((a, b) => a.localeCompare(b))
                .map((month) => {
                  const future = month > currentMonth;
                  const hasReports = Boolean(wbMonths[month]);
                  const sales = monthlySales.find((item) => item.month === month)?.sales ?? 0;

                  const classes = `rounded-xl border p-3 text-left ${
                    future
                      ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                      : month === currentMonth
                        ? "border-violet-300 bg-violet-50 hover:bg-violet-100"
                        : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                  }`;

                  return future ? (
                    <div key={month} aria-disabled="true" className={classes}>
                      <span className="block text-sm font-medium capitalize">{monthLabel(month)}</span>
                      <span className="mt-1 block text-xs text-slate-400">Пока недоступен</span>
                    </div>
                  ) : (
                    <Link key={month} href={`/dashboard/${month}`} className={classes}>
                      <span className="block text-sm font-medium capitalize">{monthLabel(month)}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                      {hasReports
  ? formatMoney(sales)
  : month === currentMonth
    ? "Текущий месяц"
    : "Нет данных"}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
