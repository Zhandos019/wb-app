import { DollarSign, Package, Receipt, TrendingUp } from "lucide-react";
import { formatNumber, formatRub } from "@/lib/format";
import type { DashboardStats } from "@/lib/excel/types";

const cards = [
  {
    key: "totalSales" as const,
    label: "Продажи",
    icon: TrendingUp,
    format: formatRub,
    accent: "text-violet-600 bg-violet-50",
  },
  {
    key: "orders" as const,
    label: "Заказы",
    icon: Package,
    format: formatNumber,
    accent: "text-blue-600 bg-blue-50",
  },
  {
    key: "avgCheck" as const,
    label: "Средний чек",
    icon: Receipt,
    format: formatRub,
    accent: "text-amber-600 bg-amber-50",
  },
  {
    key: "profit" as const,
    label: "Прибыль",
    icon: DollarSign,
    format: formatRub,
    accent: "text-emerald-600 bg-emerald-50",
  },
];

type StatCardsProps = {
  stats: DashboardStats;
};

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, format, accent }) => (
        <div
          key={key}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {format(stats[key])}
              </p>
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
