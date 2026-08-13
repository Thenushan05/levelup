import type { NotificationType } from "@/types";

/**
 * Where clicking a given notification should take you. Client-safe (no server imports) so it
 * can be shared by the bell dropdown. Returns null for types that don't have a sensible target.
 */
export function notificationTarget(type: NotificationType, meta: Record<string, unknown>): string | null {
  switch (type) {
    case "objective_complete":
    case "quest_available":
    case "nudge":
      return "/quest";
    case "quest_complete":
    case "party_quest_complete":
      return typeof meta.workoutId === "string" ? `/quest-log/${meta.workoutId}` : "/quest-log";
    case "weekly_quest_complete":
      return "/progress";
    case "achievement_unlocked":
    case "party_achievement":
      return "/achievements";
    case "level_up":
    case "party_level_up":
      return "/player";
    case "check_in":
    case "party_check_in":
    case "recovery_complete":
      return "/dashboard";
    default:
      return null;
  }
}
