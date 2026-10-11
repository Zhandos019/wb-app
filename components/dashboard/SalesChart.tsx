
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

type ChartItem = {
  name: string;
  sales: number;
};

export function SalesChart({ data }: { data: ChartItem[] }) {
  const prepared = (data || [])
    .map((item) => ({
      name: String(item.name || ""),
      sales: Number(item.sales || 0),
    }))
    .filter((item) => item.sales !== 0);

  if (!prepared.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Нет данных
      </div>
    );
  }

  const chartHeight = Math.max(400, prepared.length * 42 + 60);

  return (
    <div className="max-h-[750px] w-full overflow-y-auto overflow-x-hidden">
      <div style={{ height: chartHeight, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={prepared}
            layout="vertical"
            margin={{
              top: 15,
              right: 110,
              left: 10,
              bottom: 15,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) =>
                Number(value).toLocaleString("ru-RU")
              }
            />

            <YAxis
              type="category"
              dataKey="name"
              width={150}
              interval={0}
              tick={{ fontSize: 11 }}
            />

            <Tooltip
              formatter={(value) =>
                `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`
              }
              labelFormatter={(label) => `Товар: ${label}`}
            />

            <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
              {prepared.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={entry.sales < 0 ? "#dc2626" : "#16a34a"}
                />
              ))}

              <LabelList
                dataKey="sales"
                position="right"
                formatter={(value) =>
                  `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`
                }
                style={{ fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
