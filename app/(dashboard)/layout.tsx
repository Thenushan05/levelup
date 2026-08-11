import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { DashboardShell } from "@/components/nav/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id)
    .select("name level rank onboardingCompleted")
    .lean();
  if (!user) redirect("/login");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const unreadCount = await getUnreadNotificationCount();

  return (
    <DashboardShell playerName={user.name} level={user.level} rank={user.rank} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}
