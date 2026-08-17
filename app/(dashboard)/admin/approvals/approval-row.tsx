"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Button } from "@/components/ui/button";
import { approveXpAward, rejectXpAward, type PendingApprovalDTO } from "@/actions/approvals";
import { showErrorToast } from "@/lib/toast-system";

const REASON_LABEL: Record<string, string> = {
  check_in: "Gym Check-In",
  exercise_complete: "Exercise Complete",
  quest_complete: "Quest Complete",
  weekly_quest_complete: "Weekly Quest",
  achievement_unlocked: "Achievement",
  extra_workout: "Extra Workout",
};

export function ApprovalRow({
  approval,
  onResolved,
}: {
  approval: PendingApprovalDTO;
  onResolved: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handle(action: "approve" | "reject") {
    startTransition(async () => {
      const result = action === "approve" ? await approveXpAward(approval.id) : await rejectXpAward(approval.id);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      onResolved(approval.id);
    });
  }

  return (
    <SystemPanel noMotion className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <SystemLabel accent>{REASON_LABEL[approval.reason] ?? approval.reason}</SystemLabel>
        <p className="heading-system text-sm">{approval.userName}</p>
        <p className="truncate text-xs text-muted-foreground">{approval.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="label-system-accent text-sm">+{approval.amount} XP</span>
        <Button
          size="icon"
          variant="outline"
          onClick={() => handle("approve")}
          disabled={pending}
          aria-label="Approve"
        >
          <Check className="h-4 w-4 text-success" />
        </Button>
        <Button size="icon" variant="destructive" onClick={() => handle("reject")} disabled={pending} aria-label="Reject">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </SystemPanel>
  );
}
