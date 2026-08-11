import { toast } from "sonner";
import type { AchievementUnlockedDTO } from "@/types";

export function showAchievementToast(a: AchievementUnlockedDTO) {
  toast(`ACHIEVEMENT UNLOCKED: ${a.title.toUpperCase()}`, {
    description: `${a.description} · +${a.xpReward} XP pending approval`,
  });
}

export function showSystemToast(title: string, description?: string) {
  toast(title.toUpperCase(), { description });
}

/** All XP is queued for admin review before it counts — see actions/approvals.ts. */
export function showXpPendingToast(amount: number, reason: string) {
  if (amount <= 0) return;
  toast(`+${amount} XP PENDING`, { description: `${reason.toUpperCase()} · AWAITING ADMIN APPROVAL` });
}

export function showErrorToast(message: string) {
  toast.error("SYSTEM ERROR", { description: message });
}
