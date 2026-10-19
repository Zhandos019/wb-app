
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { StatCards } from "@/components/dashboard/StatCards";
import { EMPTY_STATS, type DashboardStats } from "@/lib/excel/types";

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
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(value) + " ₸"
  );
}

export default function MonthlyDashboardPage() {
  const params = useParams<{ month: string }>();
  const router = useRouter();
  const selectedMonth = params.month;

  const [wbMonths, setWbMonths] = useState<
    Record<string, WbMonthlyStats>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth);

    if (!valid || selectedMonth > getCurrentMonth()) {
      router.replace("/dashboard");
    }
  }, [selectedMonth, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadWbStats() {
      try {
        setLoading(true);
        setError(null);

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

    void loadWbStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyStats = useMemo<DashboardStats>(() => {
    const stats = wbMonths[selectedMonth];

    if (!stats) {
      return EMPTY_STATS;
    }

    return {
      totalSales: stats.totalSales,
      orders: stats.orders,
      avgCheck: stats.avgCheck,
      profit: stats.profit,
      storage: stats.storage,
      chart: stats.chart,
    };
  }, [wbMonths, selectedMonth]);

  const monthTitle = new Date(
    `${selectedMonth}-01T12:00:00`
  ).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell>
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          ← Назад к общей аналитике
        </Link>

        <h1 className="mt-3 text-2xl font-semibold capitalize tracking-tight text-slate-900">
          {monthTitle}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Статистика продаж по обработанным отчётам Wildberries API.
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

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Загружаем статистику Wildberries...
        </div>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Общая статистика за месяц
            </h2>

            <StatCards stats={monthlyStats} />

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-medium text-slate-500">
                Хранение за месяц
              </h3>

              <p className="text-xl font-semibold text-slate-900">
                {formatMoney(monthlyStats.storage)}
              </p>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Продажи по товарам
            </h2>

            <p className="mb-4 text-sm text-slate-500">
              Распределение продаж по артикулам из обработанных отчётов WB.
            </p>

            {monthlyStats.chart.length > 0 ? (
              <SalesChart data={monthlyStats.chart} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                За этот месяц пока нет обработанных данных о продажах.
              </p>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
