
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/subscription";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getSubscriptionAccess(user.id);

  if (!subscription.allowed) {
    redirect("/subscription");
  }

  return children;
}
