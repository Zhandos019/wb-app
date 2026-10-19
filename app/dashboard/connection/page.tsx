
"use client";

import { useEffect, useState } from "react";

type ConnectionStatus = {
  connected: boolean;
  status: string;
  tokenLast4: string | null;
  lastCheckedAt: string | null;
};

export default function WbConnectionPage() {
  const [token, setToken] = useState("");
  const [connection, setConnection] =
    useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadConnection() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wb/connection", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось загрузить статус");
      }

      setConnection(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConnection();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token.trim()) {
      setError("Вставьте токен Wildberries");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/wb/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось подключить Wildberries");
      }

      setToken("");
      setSuccess("Токен проверен и сохранён.");
      await loadConnection();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Произошла ошибка"
      );
    } finally {
      setSaving(false);
    }
  }

  const dateText = connection?.lastCheckedAt
    ? new Date(connection.lastCheckedAt).toLocaleString("ru-RU")
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Назад в аналитику
        </a>

        <h1 className="mt-4 text-2xl font-bold">
          Подключение Wildberries
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Подключите свой кабинет продавца, чтобы загружать финансовые
          отчёты и анализировать продажи.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Статус подключения
        </h2>

        {loading ? (
          <p className="mt-3 text-sm text-gray-500">
            Проверяем подключение...
          </p>
        ) : connection?.connected ? (
          <div className="mt-3 space-y-2">
            <p className="font-medium text-green-700">
              ● Wildberries подключён
            </p>
            <p className="text-sm text-gray-600">
              Токен заканчивается на: ••••{connection.tokenLast4}
            </p>
            {dateText && (
              <p className="text-sm text-gray-500">
                Проверен: {dateText}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            Wildberries пока не подключён.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          {connection?.connected ? "Заменить токен" : "Подключить кабинет"}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Создайте токен в кабинете продавца Wildberries с правами,
          необходимыми для чтения финансовых отчётов. Никому не
          отправляйте его и не публикуйте в переписках.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              API-токен Wildberries
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Вставьте токен"
              maxLength={5000}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="text-sm text-green-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || loading || !token.trim()}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Проверяем и сохраняем..." : "Проверить и сохранить"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Токен передаётся серверу по HTTPS и хранится в базе данных
          в зашифрованном виде. Полный токен после сохранения не
          показывается.
        </p>
      </section>
    </main>
  );
}
