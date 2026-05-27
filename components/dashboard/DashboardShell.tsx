"use client";

import { useState, type ReactNode } from "react";
import { MobileHeader } from "./MobileHeader";
import { Sidebar } from "./Sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          open={mobileOpen}
          onToggle={() => setMobileOpen((v) => !v)}
        />
        <main className="flex-1 overflow-x-hidden px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
