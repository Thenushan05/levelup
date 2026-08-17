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

import { dynamicCalorieRangeFor } from "@/lib/dynamic-calorie-table";

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

export interface CatalogCalorieEstimate {
  /** Midpoint of minKcal/maxKcal — the single number the UI shows. */
  kcal: number;
  minKcal: number;
  maxKcal: number;
}

export interface ExerciseCalorieInput {
  status: string;
  slug: string;
  /** Flat per-exercise range from the catalog (Exercise.calorieBurnMin/Max) — the fallback
   * used whenever the dynamic weight/bodyweight table (lib/dynamic-calorie-table.ts) has no
   * entry for this exercise, or the inputs it needs aren't available. */
  calorieBurnMin: number | null;
  calorieBurnMax: number | null;
  /** Representative weight actually logged on this exercise's completed sets — see
   * averageLoggedWeightKg(). Feeds the dynamic table lookup below. */
  loggedWeightKg: number | null;
}

/** Representative weight for a completed exercise's calorie lookup — the average across
 * completed sets that logged a weight (a set logged with no weight, e.g. bodyweight work,
 * is skipped rather than counted as 0). Null if nothing usable was logged. */
export function averageLoggedWeightKg(sets: { completed: boolean; weight?: number | null }[]): number | null {
  const weights = sets.filter((s) => s.completed && s.weight != null).map((s) => s.weight as number);
  if (weights.length === 0) return null;
  return weights.reduce((sum, w) => sum + w, 0) / weights.length;
}

function exerciseCalorieRange(exercise: ExerciseCalorieInput, bodyWeightKg: number | null): { min: number; max: number } | null {
  const dynamic = dynamicCalorieRangeFor(exercise.slug, exercise.loggedWeightKg, bodyWeightKg);
  if (dynamic) return dynamic;
  if (exercise.calorieBurnMin != null && exercise.calorieBurnMax != null) {
    return { min: exercise.calorieBurnMin, max: exercise.calorieBurnMax };
  }
  return null;
}

/**
 * Sums each exercise's calorie range across every exercise marked "complete" in a workout.
 * For exercises the dynamic weight/bodyweight table covers (lib/dynamic-calorie-table.ts),
 * and where a weight was actually logged and the user has a bodyweight on file, that table's
 * range wins; everything else falls back to the flat catalog range (Exercise.calorieBurnMin/
 * Max), same as before. This is what actually drives "today's burn" on the dashboard/quest
 * pages: it only counts what you've actually finished, and grows one exercise at a time as
 * you complete each one. Exercises with no figure from either source are skipped, not treated
 * as zero. Returns null if nothing completed (yet) has a figure to add up.
 */
function sumExerciseCalories(
  exercises: ExerciseCalorieInput[],
  bodyWeightKg: number | null
): CatalogCalorieEstimate | null {
  const ranges = exercises
    .map((e) => exerciseCalorieRange(e, bodyWeightKg))
    .filter((r): r is { min: number; max: number } => r != null);
  if (ranges.length === 0) return null;

  const minKcal = ranges.reduce((sum, r) => sum + r.min, 0);
  const maxKcal = ranges.reduce((sum, r) => sum + r.max, 0);
  return { kcal: Math.round((minKcal + maxKcal) / 2), minKcal, maxKcal };
}

export function sumCompletedExerciseCalories(
  exercises: ExerciseCalorieInput[],
  bodyWeightKg: number | null = null
): CatalogCalorieEstimate | null {
  return sumExerciseCalories(exercises.filter((e) => e.status === "complete"), bodyWeightKg);
}

/**
 * Sums the same ranges across *every* exercise scheduled today, regardless of completion —
 * i.e. "if I finish today's whole routine, this is the total." Paired with
 * sumCompletedExerciseCalories() to drive a burned-so-far-vs-today's-target gauge. In practice
 * this stays on the flat catalog figure even for dynamic-table exercises, since nothing not
 * yet completed has a logged weight to look up.
 */
export function sumAllExerciseCalories(
  exercises: ExerciseCalorieInput[],
  bodyWeightKg: number | null = null
): CatalogCalorieEstimate | null {
  return sumExerciseCalories(exercises, bodyWeightKg);
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
