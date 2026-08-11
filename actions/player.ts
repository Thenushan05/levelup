"use server";

import { DailyWorkout } from "@/models/DailyWorkout";
import { Attendance } from "@/models/Attendance";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserDoc } from "@/lib/session";
import { toPlayerSummary } from "@/lib/dto";
import { getRankProgress } from "@/lib/ranks";
import { addDays, dayOfWeekFromKey, todayKey } from "@/lib/dates";
import type { PlayerSummaryDTO, Rank } from "@/types";

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
}

export async function getPlayerStatus(): Promise<PlayerStatusDTO> {
  const user = await requireUserDoc();
  const stats = await computeStats(
    user._id.toString(),
    user.activeTemplateId ? user.activeTemplateId.toString() : null
  );
  const rankProgress = getRankProgress(user.level);

  return {
    player: toPlayerSummary(user),
    stats,
    rank: rankProgress.rank,
    nextRank: rankProgress.nextRank,
    levelsToNextRank: rankProgress.levelsToNextRank,
  };
}
