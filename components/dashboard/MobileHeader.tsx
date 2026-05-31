"use client";

import { Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type MobileHeaderProps = {
  open: boolean;
  onToggle: () => void;
};

export function MobileHeader({
  open,
  onToggle,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
      
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
          WB
        </div>

        <span className="text-sm font-semibold text-slate-900">
          WB Analytics
        </span>
      </div>

      <div className="flex items-center gap-2">
        
        <UserButton afterSignOutUrl="/sign-in" />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            open
              ? "Закрыть меню"
              : "Открыть меню"
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

      </div>
    </header>
  );
}