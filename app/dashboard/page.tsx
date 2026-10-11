
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { StatCards } from "@/components/dashboard/StatCards";
import { parseWbExcel } from "@/lib/excel/parseWbExcel";
import {
  EMPTY_STATS,
  type DashboardStats,
} from "@/lib/excel/types";
import { generateMonthPeriods, type ReportPeriod } from "@/lib/reports/periods";

import { MonthlySalesChart } from "@/components/dashboard/MonthlySalesChart";

type ReportType = "buyout" | "main";

type SavedReport = {
  id: number;
  period_start: string;
  period_end: string;
  buyout_file_name: string | null;
  buyout_stats: DashboardStats | null;
  main_file_name: string | null;
  main_stats: DashboardStats | null;
  updated_at: string;
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

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/reports", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Не удалось загрузить отчёты");
    }

    setReports(result.reports ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reports", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Не удалось загрузить отчёты");
        }

        if (!cancelled) {
          setReports(result.reports ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Ошибка загрузки данных"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const periods = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);

    if (!year || !month) return [];

    return generateMonthPeriods(year, month);
  }, [selectedMonth]);

  const monthReports = useMemo(
    () => reports.filter((report) => report.period_start.startsWith(selectedMonth)),
    [reports, selectedMonth]
  );

  const monthlySales = useMemo(() => {
    const totals = new Map<string, number>();

    for (const report of reports) {
      const month = report.period_start.slice(0, 7);

      const buyoutSales = report.buyout_stats?.totalSales ?? 0;
      const mainSales = report.main_stats?.totalSales ?? 0;

      totals.set(
        month,
        (totals.get(month) ?? 0) + buyoutSales + mainSales
      );
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, sales]) => ({
        month,
        name: new Date(`${month}-01T12:00:00`).toLocaleDateString(
          "ru-RU",
          { month: "short", year: "numeric" }
        ),
        sales,
      }));
  }, [reports]);

  const monthlyStats = useMemo<DashboardStats>(() => {
    const allStats = monthReports.flatMap((report) => [
      report.buyout_stats,
      report.main_stats,
    ]).filter((stats): stats is DashboardStats => stats !== null);

    if (allStats.length === 0) return EMPTY_STATS;

    const totalSales = allStats.reduce(
      (sum, stats) => sum + stats.totalSales,
      0
    );
    const orders = allStats.reduce(
      (sum, stats) => sum + stats.orders,
      0
    );
    const profit = allStats.reduce(
      (sum, stats) => sum + stats.profit,
      0
    );
    const storage = allStats.reduce(
      (sum, stats) => sum + stats.storage,
      0
    );

    const articles = new Map<string, number>();

    for (const stats of allStats) {
      for (const item of stats.chart) {
        articles.set(
          item.name,
          (articles.get(item.name) ?? 0) + item.sales
        );
      }
    }

    const chart = [...articles.entries()]
  .filter(([, sales]) => sales !== 0)
  .sort((a, b) => b[1] - a[1])
  .map(([name, sales]) => ({ name, sales }));

    return {
      totalSales,
      orders,
      avgCheck: orders ? totalSales / orders : 0,
      profit,
      storage,
      chart,
    };
  }, [monthReports]);

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    period: ReportPeriod,
    reportType: ReportType
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Выберите файл Excel с расширением .xlsx или .xls");
      return;
    }

    const key = `${period.start}_${reportType}`;

    setUploading(key);
    setError(null);
    setNotice(null);

    try {
      const buffer = await file.arrayBuffer();
const stats = parseWbExcel(
  buffer,
  period.start,
  period.end
);

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: period.start,
          periodEnd: period.end,
          reportType,
          fileName: file.name,
          stats,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Не удалось сохранить отчёт");
      }

      await loadReports();
      setNotice(`Отчёт «${file.name}» сохранён.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось обработать файл"
      );
    } finally {
      setUploading(null);
    }
  }

  function findReport(period: ReportPeriod) {
    return reports.find(
      (report) =>
        report.period_start === period.start &&
        report.period_end === period.end
    );
  }

  function renderUploadSlot(
    period: ReportPeriod,
    type: ReportType,
    title: string,
    fileName: string | null | undefined
  ) {
    const key = `${period.start}_${type}`;
    const isUploading = uploading === key;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {title}
            </h3>
            <p className="mt-1 break-all text-xs text-slate-500">
              {fileName || "Файл ещё не загружен"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
              fileName
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {fileName ? "Сохранён" : "Нет файла"}
          </span>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          {isUploading
            ? "Обработка..."
            : fileName
              ? "Заменить файл"
              : "Загрузить Excel"}
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={uploading !== null}
            className="hidden"
            onChange={(event) =>
              void handleUpload(event, period, type)
            }
          />
        </label>
      </div>
    );
  }

  const monthTitle = selectedMonth
    ? new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString(
        "ru-RU",
        { month: "long", year: "numeric" }
      )
    : "";

  return (
    <DashboardShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Аналитика Wildberries
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Отчёты по периодам, продажи и показатели за месяц
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Отчётный месяц
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Выберите месяц, чтобы просмотреть периоды и статистику.
            </p>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Общая статистика за {monthTitle}
        </h2>
        <StatCards stats={monthlyStats} />
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-1 text-sm font-medium text-slate-500">
            Хранение за месяц
          </h3>
          <p className="text-xl font-semibold text-slate-900">
            {formatMoney(monthlyStats.storage)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Сумма показателей хранения из сохранённых отчётов.
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Динамика продаж по месяцам
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Сравнение продаж с предыдущим месяцем по обоим типам отчётов.
          </p>
        </div>

        <MonthlySalesChart
          data={monthlySales}
          selectedMonth={selectedMonth}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Продажи по товарам
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Данные из загруженных отчётов за выбранный месяц.
            </p>
          </div>
          <span className="text-sm text-slate-500">
            {monthlyStats.chart.length} товаров
          </span>
        </div>
        <SalesChart data={monthlyStats.chart} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Отчёты по периодам
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Загружайте основной отчёт и отчёт по выкупам отдельно.
            Повторная загрузка заменяет сохранённые показатели этого типа.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Загружаем сохранённые отчёты...
          </div>
        ) : (
          <div className="space-y-4">
            {periods.map((period) => {
              const saved = findReport(period);

              return (
                <article
                  key={`${period.start}_${period.end}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {period.label}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {period.start} — {period.end}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {renderUploadSlot(
                      period,
                      "buyout",
                      "Отчёт по выкупам",
                      saved?.buyout_file_name
                    )}
                    {renderUploadSlot(
                      period,
                      "main",
                      "Основной отчёт",
                      saved?.main_file_name
                    )}
                  </div>

                  {saved && (
                    <p className="mt-3 text-xs text-slate-500">
                      Последнее обновление:{" "}
                      {new Date(saved.updated_at).toLocaleString("ru-RU")}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
