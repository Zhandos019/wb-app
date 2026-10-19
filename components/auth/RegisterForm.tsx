
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(
        step === "register"
        ? "/api/auth/register"
: "/api/verify-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            step === "register"
              ? { email, password }
              : { email, token }
          ),
        }
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Не удалось выполнить запрос");
        return;
      }

      if (step === "register") {
        setStep("verify");
        setPassword("");
        setSuccess(
          data.message ||
            "Мы отправили код на вашу почту. Введите его ниже."
        );
      } else {
        router.push("/login?confirmed=1");
      }
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {step === "register" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-violet-500/30 transition focus:border-violet-400 focus:ring-4"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Пароль
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-violet-500/30 transition focus:border-violet-400 focus:ring-4"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Минимум 8 символов
            </span>
          </label>
        </>
      ) : (
        <>
         
<div className="space-y-3">
  <div className="text-sm text-slate-600">
    Код отправлен на <strong>{email}</strong>.
  </div>

  <div
    role="status"
    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
  >
    <p className="font-semibold">
      Не получили письмо?
    </p>
    <p className="mt-1">
      Проверьте папку «Спам» — письмо с кодом подтверждения могло попасть туда.
      Если письма нет, проверьте правильность указанного email.
    </p>
  </div>
</div>


          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Код подтверждения
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={token}
              onChange={(e) =>
                setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-xl tracking-[0.4em] text-slate-900 outline-none ring-violet-500/30 transition focus:border-violet-400 focus:ring-4"
              placeholder="000000"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Введите шестизначный код из письма.
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              setStep("register");
              setToken("");
              setError(null);
              setSuccess(null);
            }}
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Изменить email
          </button>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        {loading
          ? "Подождите..."
          : step === "register"
            ? "Получить код"
            : "Подтвердить код"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-medium text-violet-600 hover:text-violet-700"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
