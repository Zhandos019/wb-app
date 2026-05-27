"use client";

import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { label: "Обзор", icon: LayoutDashboard, active: true },
  { label: "Продажи", icon: TrendingUp, active: false },
  { label: "Заказы", icon: ShoppingCart, active: false },
  { label: "Отчёты", icon: BarChart3, active: false },
  { label: "Товары", icon: Package, active: false },
  { label: "Настройки", icon: Settings, active: false },
];

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
          WB
        </div>
        <div>
          <p className="text-sm font-semibold text-white">WB Analytics</p>
          <p className="text-xs text-slate-500">Wildberries</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            onClick={onNavigate}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-violet-500/15 text-violet-300"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs text-slate-500">Версия 1.0</p>
        <p className="mt-0.5 text-xs text-slate-600">Аналитика продаж</p>
      </div>
    </aside>
  );
}
