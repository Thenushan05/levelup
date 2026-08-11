import type { Types } from "mongoose";
import { getRankForLevel } from "@/lib/ranks";
import { connectToDatabase } from "@/lib/mongodb";
import { PendingXpAward } from "@/models/PendingXpAward";
import type { LevelUpResult, Rank } from "@/types";

export type XpReason =
  | "check_in"
  | "exercise_complete"
  | "quest_complete"
  | "weekly_quest_complete"
  | "achievement_unlocked";

/**
 * The entire leveling curve lives here so it's configurable in one place.
 * requiredXp(level) = XP_BASE + level * XP_INCREMENT
 */
export const XP_BASE = 100;
export const XP_INCREMENT = 50;

export function requiredXpForLevel(level: number): number {
  return XP_BASE + level * XP_INCREMENT;
}

/**
 * Fixed, server-only XP grants. The client never supplies an XP amount —
 * every award below is chosen by server code after it has verified the
 * underlying condition itself (see actions/*.ts). No path exists for bonus
 * XP tied to volume, duration, frequency, or skipping rest.
 */
export const XP_VALUES = {
  GYM_CHECK_IN: 10,
  EXERCISE_COMPLETE: 5,
  WORKOUT_COMPLETE: 50,
  WEEKLY_QUEST_COMPLETE: 100,
  SEVEN_DAY_STREAK: 100,
} as const;

interface XpMutable {
  level: number;
  xp: number;
  rank: string;
}

/**
 * Mutates a user-like object's xp/level/rank in place and reports what
 * changed. Callers are responsible for persisting (`user.save()`) — kept
 * as a pure function so it composes cleanly across multiple award events
 * within a single action before one final save.
 */
export function applyXp<T extends XpMutable>(user: T, amount: number): LevelUpResult {
  const fromLevel = user.level;
  const fromRank = user.rank as Rank;

  if (amount > 0) {
    user.xp += amount;
    while (user.xp >= requiredXpForLevel(user.level)) {
      user.xp -= requiredXpForLevel(user.level);
      user.level += 1;
    }
  }

  const toLevel = user.level;
  const toRank = getRankForLevel(toLevel);
  user.rank = toRank;

  return {
    leveledUp: toLevel > fromLevel,
    fromLevel,
    toLevel,
    fromRank,
    toRank,
    rankChanged: toRank !== fromRank,
  };
}

/** Snapshot before a chain of XP-awarding events, so the caller can compute
 * one combined before/after LevelUpResult instead of stitching partial ones. */
export function snapshotLevel<T extends XpMutable>(user: T) {
  return { level: user.level, rank: user.rank as Rank };
}

export function diffLevel<T extends XpMutable>(
  before: { level: number; rank: Rank },
  user: T
): LevelUpResult {
  return {
    leveledUp: user.level > before.level,
    fromLevel: before.level,
    toLevel: user.level,
    fromRank: before.rank,
    toRank: user.rank as Rank,
    rankChanged: user.rank !== before.rank,
  };
}

/**
 * Every XP-earning event goes through here instead of applyXp(): it queues
 * a review item rather than touching the user's xp/level, so a coach/admin
 * has to approve it (see actions/approvals.ts) before it counts. Progress
 * state (set/exercise/quest completion, streaks, totals) is NOT gated —
 * only the XP number is held back.
 */
export async function queueXpAward(
  userId: Types.ObjectId | string,
  amount: number,
  reason: XpReason,
  title: string
): Promise<void> {
  if (amount <= 0) return;
  await connectToDatabase();
  await PendingXpAward.create({ userId, amount, reason, title });
}
