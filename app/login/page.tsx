
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    confirmed?: string;
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const registered = params.registered === "1";
  const confirmed = params.confirmed === "1";

  const errorMessage =
    params.error === "confirmation_failed"
      ? "Не удалось подтвердить email. Возможно, ссылка истекла или уже использована. Запросите новое письмо."
      : params.error === "account_link_failed"
        ? "Email подтверждён, но не удалось связать профиль с приложением. Обратитесь в поддержку."
        : null;

  return (
    <AuthShell
      title="Вход"
      subtitle="Войдите, чтобы открыть аналитику Wildberries"
    >
      {registered && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Аккаунт создан. Проверьте почту и подтвердите email перед входом.
        </div>
      )}

      {confirmed && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Email успешно подтверждён. Теперь можете войти в аккаунт.
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <LoginForm />
    </AuthShell>
  );
}
