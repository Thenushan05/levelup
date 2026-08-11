import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { addDays, dayOfWeekFromKey, todayKey } from "@/lib/dates";
import type { HydratedDocument } from "mongoose";
import type { UserDoc } from "@/models/User";

const LOOKBACK_DAYS = 400;

/**
 * Recomputes currentStreak/longestStreak from actual schedule adherence
 * (not just "did anything today"). Rest and optional days never break the
 * streak — they're automatically compliant. A scheduled workout day only
 * breaks the streak once it's fully in the past with no completed quest.
 * Mutates the user doc in place; caller persists it.
 */
export async function recomputeStreak(user: HydratedDocument<UserDoc>): Promise<void> {
  if (!user.activeTemplateId) {
    user.currentStreak = 0;
    return;
  }

  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) {
    user.currentStreak = 0;
    return;
  }

  const scheduleByDow = new Map(template.schedule.map((d) => [d.dayOfWeek, d]));
  const today = todayKey();
  const rangeStart = addDays(today, -LOOKBACK_DAYS);

  const workouts = await DailyWorkout.find({
    userId: user._id,
    type: "workout",
    date: { $gte: rangeStart, $lte: today },
  })
    .select("date status")
    .lean();

  const statusByDate = new Map(workouts.map((w) => [w.date, w.status]));

  function isCompliant(dateKey: string): boolean {
    const entry = scheduleByDow.get(dayOfWeekFromKey(dateKey));
    if (!entry || entry.type !== "workout") return true; // rest / optional / no plan for that day
    return statusByDate.get(dateKey) === "complete";
  }

  let base = 0;
  let cursor = addDays(today, -1);
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    if (!isCompliant(cursor)) break;
    base += 1;
    cursor = addDays(cursor, -1);
  }

  const current = isCompliant(today) ? base + 1 : base;

  user.currentStreak = current;
  if (current > user.longestStreak) {
    user.longestStreak = current;
  }
}
