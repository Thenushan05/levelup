import type { Metadata } from "next";
import { getPendingApprovals } from "@/actions/approvals";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { ApprovalsView } from "./approvals-view";

export const metadata: Metadata = { title: "Admin — Approvals — LevelUp" };

export default async function AdminApprovalsPage() {
  const approvals = await getPendingApprovals();

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Admin</SystemLabel>
        <SystemHeading className="mt-1">XP Approvals</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Every check-in, completed exercise, quest, weekly quest, and achievement waits here until you review it.
        </p>
      </div>
      <ApprovalsView initial={approvals} />
    </div>
  );
}
