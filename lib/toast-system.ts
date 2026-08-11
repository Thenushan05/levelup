import { toast } from "sonner";
import type { AchievementUnlockedDTO } from "@/types";

export function showAchievementToast(a: AchievementUnlockedDTO) {
  toast(`ACHIEVEMENT UNLOCKED: ${a.title.toUpperCase()}`, {
    description: `${a.description} · +${a.xpReward} XP`,
  });
}

export function showSystemToast(title: string, description?: string) {
  toast(title.toUpperCase(), { description });
}

export function showXpToast(amount: number, reason: string) {
  if (amount <= 0) return;
  toast(`+${amount} XP`, { description: reason.toUpperCase() });
}

export function showErrorToast(message: string) {
  toast.error("SYSTEM ERROR", { description: message });
}
