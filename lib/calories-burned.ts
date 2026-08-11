// Calorie burn is estimated with the standard ACSM metabolic equation used
// throughout exercise science, not an invented number:
//   kcal/min = MET * 3.5 * weight(kg) / 200   (== MET * weight(kg) * 0.0175)
// MET values come from the Compendium of Physical Activities (Ainsworth et
// al.) — 5.0 is the compendium's value for moderate-to-vigorous general
// resistance training; 4.0 covers light leisure activity (walking, easy
// cycling, mobility work) for "optional"/light-activity days.
//
// Duration: when a workout is actually completed, we use the *real* logged
// duration (DailyWorkout.startedAt -> completedAt, see lib/dates.ts's
// durationMinutes) — not a guess. Only for a workout that hasn't been done
// yet (a same-day preview) do we fall back to a time-per-set estimate, and
// the result always says which one it is so the UI never presents an
// estimate as if it were a measured fact.

export const MET_VALUES = {
  RESISTANCE_TRAINING: 5.0,
  LIGHT_ACTIVITY: 4.0,
} as const;

/** ~45-60s under load + 60-90s rest per straight set — a commonly used
 * planning estimate for resistance training, used only as a fallback. */
const SECONDS_PER_SET_ESTIMATE = 150;

export function kcalPerMinute(met: number, weightKg: number): number {
  return met * weightKg * 0.0175;
}

export interface WorkoutCalorieEstimate {
  kcal: number;
  minutes: number;
  /** true = real startedAt/completedAt duration; false = estimated from set count. */
  isActualDuration: boolean;
  met: number;
}

export function estimateWorkoutCalories(params: {
  weightKg: number;
  type: "workout" | "rest" | "optional";
  totalSets: number;
  /** Real logged duration in minutes, if the workout has been completed. */
  durationMinutes: number | null;
}): WorkoutCalorieEstimate | null {
  if (params.type !== "workout" || params.totalSets <= 0) return null;

  const met = MET_VALUES.RESISTANCE_TRAINING;
  const isActualDuration = params.durationMinutes != null && params.durationMinutes > 0;
  const minutes = isActualDuration
    ? (params.durationMinutes as number)
    : Math.round((params.totalSets * SECONDS_PER_SET_ESTIMATE) / 60);

  const kcal = Math.round(kcalPerMinute(met, params.weightKg) * minutes);
  return { kcal, minutes, isActualDuration, met };
}

/** Rough estimate for a light-activity day, since there's no logged
 * exercise data to base it on — always presented as a range, never a fake
 * point estimate. */
export function lightActivityCalorieRange(weightKg: number): { low: number; high: number } {
  const perMin = kcalPerMinute(MET_VALUES.LIGHT_ACTIVITY, weightKg);
  return { low: Math.round(perMin * 20), high: Math.round(perMin * 45) };
}

/**
 * Real-time calorie burn "so far" for a workout that's still in progress —
 * elapsed time between when it was started and `asOf` (pass the current
 * moment for a live figure, or the timestamp of the action that just
 * happened), at the same MET used for a finished workout. This is what
 * lets the number climb as each set gets logged instead of only appearing
 * once the whole workout is complete.
 *
 * Uses sub-minute precision for the kcal math itself (not the whole-minute
 * rounding lib/dates's durationMinutes uses for display) — the very first
 * set of a session is often logged well under a minute after starting, and
 * rounding that down to "0 minutes" would wrongly report zero calories and
 * make the live figure not appear at all until a full minute has passed.
 */
export function caloriesBurnedSoFar(params: {
  weightKg: number;
  type: "workout" | "rest" | "optional";
  startedAt: Date | string | null;
  asOf: Date | string | null;
}): WorkoutCalorieEstimate | null {
  if (params.type !== "workout" || !params.startedAt || !params.asOf) return null;

  const startMs = new Date(params.startedAt).getTime();
  const asOfMs = new Date(params.asOf).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(asOfMs) || asOfMs <= startMs) return null;

  const preciseMinutes = (asOfMs - startMs) / 60000;
  const met = MET_VALUES.RESISTANCE_TRAINING;
  const kcal = Math.round(kcalPerMinute(met, params.weightKg) * preciseMinutes);
  return { kcal, minutes: Math.round(preciseMinutes), isActualDuration: true, met };
}
