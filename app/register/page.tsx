import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getAuthUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт для доступа к дашборду"
    >
      <RegisterForm />
    </AuthShell>
  );
}
