import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { getPendingApprovalCount } from "@/actions/approvals";
import { DashboardShell } from "@/components/nav/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id)
    .select("name level rank onboardingCompleted isAdmin")
    .lean();
  if (!user) redirect("/login");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const isAdmin = !!user.isAdmin;
  const [unreadCount, pendingApprovalCount] = await Promise.all([
    getUnreadNotificationCount(),
    isAdmin ? getPendingApprovalCount() : Promise.resolve(0),
  ]);

  return (
    <DashboardShell
      playerName={user.name}
      level={user.level}
      rank={user.rank}
      unreadCount={unreadCount}
      isAdmin={isAdmin}
      pendingApprovalCount={pendingApprovalCount}
    >
      {children}
    </DashboardShell>
  );
}
