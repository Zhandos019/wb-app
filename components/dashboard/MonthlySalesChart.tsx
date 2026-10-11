
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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

  const previousDate = new Date(
    `${selectedMonth}-01T12:00:00`
  );
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
            {hasPrevious ? formatMoney(previousSales) : "Нет данных"}
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

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Загрузите отчёты, чтобы увидеть динамику продаж
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 15, right: 20, left: 15, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
              />

              <YAxis
                width={90}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("ru-RU", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />

              <Tooltip
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.name ?? ""
                }
                formatter={(value) => [
                  formatMoney(Number(value ?? 0)),
                  "Продажи",
                ]}
              />

              <Line
                type="monotone"
                dataKey="sales"
                name="Продажи"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
