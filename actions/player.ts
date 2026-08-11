"use server";

import { DailyWorkout } from "@/models/DailyWorkout";
import { Attendance } from "@/models/Attendance";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { PendingXpAward } from "@/models/PendingXpAward";
import { requireUserDoc } from "@/lib/session";
import { toPlayerSummary } from "@/lib/dto";
import { getRankForLevel, getRankProgress } from "@/lib/ranks";
import { addDays, dayOfWeekFromKey, todayKey } from "@/lib/dates";
import type { LevelUpResult, PlayerSummaryDTO, Rank } from "@/types";

export interface PlayerStatsDTO {
  consistency: number;
  workoutCompletion: number;
  attendance: number;
}

const STATS_WINDOW_DAYS = 30;

async function computeStats(userId: string, activeTemplateId: string | null): Promise<PlayerStatsDTO> {
  const today = todayKey();
  const windowStart = addDays(today, -(STATS_WINDOW_DAYS - 1));

  let scheduledWorkoutDays = 0;
  if (activeTemplateId) {
    const template = await WorkoutTemplate.findById(activeTemplateId).lean();
    if (template) {
      for (let i = 0; i < STATS_WINDOW_DAYS; i++) {
        const d = addDays(windowStart, i);
        const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(d));
        if (entry?.type === "workout") scheduledWorkoutDays++;
      }
    }
  }

  const completedWorkoutDays = await DailyWorkout.countDocuments({
    userId,
    type: "workout",
    status: "complete",
    date: { $gte: windowStart, $lte: today },
  });
  const consistency =
    scheduledWorkoutDays > 0 ? Math.round((completedWorkoutDays / scheduledWorkoutDays) * 100) : 0;

  const attendanceDays = await Attendance.countDocuments({
    userId,
    date: { $gte: windowStart, $lte: today },
  });
  const attendance = Math.min(100, Math.round((attendanceDays / STATS_WINDOW_DAYS) * 100));

  const attemptedWorkouts = await DailyWorkout.find({
    userId,
    type: "workout",
    status: { $in: ["complete", "in_progress"] },
    date: { $gte: windowStart, $lte: today },
  })
    .select("progressPercentage")
    .lean();
  const workoutCompletion =
    attemptedWorkouts.length > 0
      ? Math.round(
          attemptedWorkouts.reduce((sum, w) => sum + w.progressPercentage, 0) / attemptedWorkouts.length
        )
      : 0;

  return { consistency, workoutCompletion, attendance };
}

export interface PlayerStatusDTO {
  player: PlayerSummaryDTO;
  stats: PlayerStatsDTO;
  rank: Rank;
  nextRank: Rank | null;
  levelsToNextRank: number | null;
  /** Queued XP awaiting admin approval — not yet reflected in player.xp/level. */
  pendingXp: number;
  /** False for anyone who onboarded before body stats existed, or skipped
   * filling them in via Settings — gates the Diet & Body calculations. */
  hasBodyStats: boolean;
  /**
   * Set when the player's level has moved past what they've last
   * acknowledged seeing — since XP now lands via admin approval (possibly
   * while they're not in the app), this is how the LEVEL UP celebration
   * still gets shown, just on their next visit instead of in the moment.
   */
  newLevelUp: LevelUpResult | null;
}

export async function getPlayerStatus(): Promise<PlayerStatusDTO> {
  const user = await requireUserDoc();
  const [stats, pendingRows] = await Promise.all([
    computeStats(user._id.toString(), user.activeTemplateId ? user.activeTemplateId.toString() : null),
    PendingXpAward.aggregate([
      { $match: { userId: user._id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const rankProgress = getRankProgress(user.level);

  let newLevelUp: LevelUpResult | null = null;
  if (user.level > user.lastSeenLevel) {
    const fromRank = getRankForLevel(user.lastSeenLevel);
    newLevelUp = {
      leveledUp: true,
      fromLevel: user.lastSeenLevel,
      toLevel: user.level,
      fromRank,
      toRank: user.rank as Rank,
      rankChanged: fromRank !== user.rank,
    };
  }

  return {
    player: toPlayerSummary(user),
    stats,
    rank: rankProgress.rank,
    nextRank: rankProgress.nextRank,
    levelsToNextRank: rankProgress.levelsToNextRank,
    pendingXp: pendingRows[0]?.total ?? 0,
    hasBodyStats: user.weightKg != null && user.heightCm != null && user.age != null && !!user.biologicalSex,
    newLevelUp,
  };
}

/** Marks the LEVEL UP celebration as seen so it doesn't show again on the next visit. */
export async function acknowledgeLevelUp(toLevel: number): Promise<void> {
  const user = await requireUserDoc();
  if (toLevel > user.lastSeenLevel) {
    user.lastSeenLevel = Math.min(toLevel, user.level);
    await user.save();
  }
}
