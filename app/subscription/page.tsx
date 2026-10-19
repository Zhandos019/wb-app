
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/subscription";
import { LogoutButton } from "@/components/auth/LogoutButton";
export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getSubscriptionAccess(user.id);

  if (subscription.allowed) {
    redirect("/dashboard");
  }

  const endDate = subscription.endsAt
    ? new Date(subscription.endsAt).toLocaleString("ru-RU", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Almaty",
      })
    : null;

  const verificationError = subscription.reason === "lookup_error";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Подписка на WB Analytics
        </h1>

        {verificationError ? (
          <>
            <p className="mt-4 text-gray-700">
              Не удалось проверить статус подписки. Доступ временно ограничен.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Попробуйте обновить страницу позже. Если проблема повторяется,
              обратитесь в поддержку.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-gray-700">
              Пробный период завершён или у аккаунта нет действующей подписки.
            </p>

            {endDate && (
              <p className="mt-3 text-sm text-gray-500">
                Дата окончания последнего периода: {endDate}
              </p>
            )}

            <p className="mt-4 text-gray-700">
              Для продолжения работы потребуется активировать платную подписку.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Онлайн-оплата пока не подключена.
            </p>
          </>
        )}

<LogoutButton />
      </section>
    </main>
  );
}
