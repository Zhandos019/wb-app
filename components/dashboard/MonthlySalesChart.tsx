
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlySales = {
  month: string;
  name: string;
  sales: number;
};

type Props = {
  data: MonthlySales[];
  selectedMonth: string;
};

function formatMoney(value: number) {
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(value) + " ₸"
  );
}

function formatMonth(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(
    "ru-RU",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export function MonthlySalesChart({
  data,
  selectedMonth,
}: Props) {
  const current = data.find(
    (item) => item.month === selectedMonth
  );

  const previousDate = new Date(`${selectedMonth}-01T12:00:00`);
  previousDate.setMonth(previousDate.getMonth() - 1);

  const previousMonth = [
    previousDate.getFullYear(),
    String(previousDate.getMonth() + 1).padStart(2, "0"),
  ].join("-");

  const previous = data.find(
    (item) => item.month === previousMonth
  );

  const currentSales = current?.sales ?? 0;
  const previousSales = previous?.sales ?? 0;
  const difference = currentSales - previousSales;

  const percent =
    previous && previousSales !== 0
      ? (difference / Math.abs(previousSales)) * 100
      : null;

  const hasPrevious = Boolean(previous);

  const chartData = [...data].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const maxSales = Math.max(
    0,
    ...chartData.map((item) => item.sales)
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            Продажи за {formatMonth(selectedMonth)}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatMoney(currentSales)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            Предыдущий месяц
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {hasPrevious
              ? formatMoney(previousSales)
              : "Нет данных"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            Изменение к предыдущему месяцу
          </p>

          {percent === null ? (
            <p className="mt-2 text-lg font-semibold text-slate-500">
              {hasPrevious
                ? "Нельзя рассчитать %"
                : "Нет данных для сравнения"}
            </p>
          ) : (
            <>
              <p
                className={`mt-2 text-xl font-semibold ${
                  difference > 0
                    ? "text-emerald-600"
                    : difference < 0
                      ? "text-red-600"
                      : "text-slate-700"
                }`}
              >
                {difference > 0 ? "+" : ""}
                {percent.toLocaleString("ru-RU", {
                  maximumFractionDigits: 1,
                })}
                %
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {difference > 0 ? "+" : ""}
                {formatMoney(difference)}
              </p>
            </>
          )}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-slate-500">
          Загрузите отчёты, чтобы увидеть динамику продаж
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-900">
              Динамика продаж
            </p>
            <span className="text-xs text-gray-400">
              По месяцам
            </span>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#f3f4f6"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                />

                <YAxis
                  hide
                  domain={[0, maxSales > 0 ? maxSales * 1.1 : 1]}
                />

                <Tooltip
                  cursor={{ fill: "#f5f3ff" }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload
                      ? formatMonth(payload[0].payload.month)
                      : ""
                  }
                  formatter={(value) => [
                    formatMoney(Number(value ?? 0)),
                    "Продажи",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />

                <Bar
                  dataKey="sales"
                  name="Продажи"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={34}
                  animationDuration={500}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.month}
                      fill="#8b5cf6"
                      fillOpacity={
                        item.month === selectedMonth ? 1 : 0.8
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
