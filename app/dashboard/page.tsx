"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ExcelUpload } from "@/components/dashboard/ExcelUpload";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { StatCards } from "@/components/dashboard/StatCards";
import { EMPTY_STATS, type DashboardStats } from "@/lib/excel/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [error, setError] = useState<string | null>(null);

  return (
    <DashboardShell>
      <header className="mb-6 hidden md:block">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Аналитика Wildberries
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Загрузите отчёт из личного кабинета WB для расчёта KPI и графика
          продаж
        </p>
      </header>

      <div className="mb-6 md:hidden">
        <h1 className="text-xl font-semibold text-slate-900">Обзор</h1>
        <p className="mt-0.5 text-sm text-slate-500">Аналитика продаж WB</p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <StatCards stats={stats} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ExcelUpload onData={setStats} onError={setError} />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2 md:p-6">
          <div className="mb-4 flex items-center justify-between">
          <div className="mb-3 flex gap-2">
  <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
    📦 Хранение:{" "}
    <span className="font-semibold text-slate-900">
      {stats.storage?.toLocaleString("ru-RU") || 0} ₸
    </span>
  </div>
</div>
            <h2 className="text-sm font-semibold text-slate-800">
              Выручка по товарам
            </h2>
            {stats.chart.length > 0 && (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {stats.chart.length} товаров
              </span>
            )}
          </div>
          <div className="w-full min-w-0">
  <SalesChart data={stats.chart} />
</div>
        </div>
      </div>
    </DashboardShell>
  );
}
