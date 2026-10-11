"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onLogout() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Не удалось выйти из аккаунта.");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Ошибка выхода. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onLogout}
        disabled={loading}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {loading ? "Выход…" : "Выйти"}
      </button>

      {error && (
        <p role="alert" className="mt-2 px-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}