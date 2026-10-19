"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Plug,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";

type SidebarProps = {
  onNavigate?: () => void;
};

const navItems = [
  { label: "Обзор", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Продажи", icon: TrendingUp, href: "/dashboard/sales" },
  { label: "Заказы", icon: ShoppingCart, href: "/dashboard/orders" },
  { label: "Отчёты", icon: BarChart3, href: "/dashboard/reports" },
  { label: "Товары", icon: Package, href: "/dashboard/products" },
  { label: "Настройки", icon: Settings, href: "/dashboard/settings" },
  { label: "Подключение WB", icon: Plug, href: "/dashboard/connection" },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

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
        {navItems.map(({ label, icon: Icon, href }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        <LogoutButton />
        <p className="mt-3 px-3 text-xs text-slate-500">Версия 1.0</p>
        <p className="mt-0.5 px-3 text-xs text-slate-600">Аналитика продаж</p>
      </div>
    </aside>
  );
}
