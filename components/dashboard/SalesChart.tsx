"use client";
import { Cell } from "recharts";
import { LabelList } from "recharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type ChartItem = {
  name: string;
  sales: number;
};

export function SalesChart({
  data,
}: {
  data: ChartItem[];
}) {

  const prepared = (data || []).map((item) => ({
    name: String(item.name || ""),
    sales: Number(item.sales || 0),
  }));

  if (!prepared.length) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        Нет данных
      </div>
    );
  }

  return (

    <div className="w-full h-[500px]">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <BarChart
          data={prepared}
          layout="vertical"
          margin={{
            top: 20,
            right: 80,
            left: 140,
            bottom: 20,
          }}
        >

<CartesianGrid stroke="transparent" />

          <XAxis type="number" />

          <YAxis
            type="category"
            dataKey="name"
            width={30}
            interval={0}
          />

          <Tooltip
            formatter={(value) =>
              `${Number(value).toLocaleString("ru-RU")} ₸`
            }
          />


<Bar dataKey="sales" radius={[0, 6, 6, 0]}>
  {prepared.map((entry, index) => (
    <Cell
      key={index}
      fill={entry.sales < 0 ? "#dc2626" : "#16a34a"}
    />
  ))}

  <LabelList
    dataKey="sales"
    position="right"
    formatter={(value: any) =>
      `${Number(value || 0).toLocaleString("ru-RU")} ₸`
    }
  />
</Bar>

        </BarChart>
       
       
      </ResponsiveContainer>

    </div>
  );
}