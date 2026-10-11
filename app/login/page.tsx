import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const user = await getAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const registered = params.registered === "1";

  return (
    <AuthShell
      title="Вход"
      subtitle="Войдите, чтобы открыть аналитику Wildberries"
    >
      {registered && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Аккаунт создан. Войдите с вашим email и паролем.
        </div>
      )}
      <LoginForm />
    </AuthShell>
  );
}
