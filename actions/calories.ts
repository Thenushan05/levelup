"use server";

import type { Types } from "mongoose";
import { DailyWorkout } from "@/models/DailyWorkout";
import { Exercise } from "@/models/Exercise";
import { requireUserDoc } from "@/lib/session";
import { todayKey } from "@/lib/dates";
import {
  averageLoggedWeightKg,
  modeAssistLevel,
  sumCompletedExerciseCalories,
  sumAllExerciseCalories,
  type ExerciseCalorieInput,
  type CatalogCalorieEstimate,
} from "@/lib/calories-burned";
import {
  dynamicCalorieRangeFor,
  assistLevelCalorieRangeFor,
  bodyWeightOnlyCalorieRangeFor,
  type AssistLevel,
} from "@/lib/dynamic-calorie-table";
import { getTotalCalorieBurn, type TotalCalorieBurnDTO } from "@/actions/workout";

const HISTORY_LIMIT = 7;

export interface CalorieExerciseRowDTO {
  name: string;
  status: string;
  targetSets: number;
  /** Average weight logged on this exercise's completed sets — null before it's done, or if
   * it's a bodyweight movement that never logs one. */
  loggedWeightKg: number | null;
  /** Assist level selected on this exercise's completed sets (Assisted Pull-Ups only) — null
   * for every other exercise. */
  assistLevel: AssistLevel | null;
  /** Which figure minKcal/maxKcal actually came from. "unavailable" only if neither the
   * dynamic table nor the flat catalog has a number for this exercise. */
  source: "dynamic" | "catalog" | "unavailable";
  /** Set only when source is "dynamic" — which weight bracket and bodyweight band matched. */
  weightTierLabel: string | null;
  bodyWeightBandLabel: string | null;
  minKcal: number | null;
  maxKcal: number | null;
  kcal: number | null;
  /** True once an admin has approved this exercise's XP award (see
   * ExerciseEntrySchema.calorieApproved) — its burn only counts toward "Logged" below that. */
  approved: boolean;
}

export interface CalorieTrackingTodayDTO {
  workoutName: string;
  type: "workout" | "rest" | "optional";
  exercises: CalorieExerciseRowDTO[];
  /** Admin-approved exercises only — the official, "logged" figure. */
  logged: CatalogCalorieEstimate | null;
  /** Completed but awaiting admin approval. */
  pending: CatalogCalorieEstimate | null;
  /** Every exercise scheduled today, regardless of completion. */
  target: CatalogCalorieEstimate | null;
}

export interface CalorieTrackingHistoryRowDTO {
  date: string;
  workoutName: string;
  logged: CatalogCalorieEstimate | null;
  pending: CatalogCalorieEstimate | null;
}

export interface CalorieTrackingDTO {
  hasBodyWeight: boolean;
  today: CalorieTrackingTodayDTO | null;
  history: CalorieTrackingHistoryRowDTO[];
  /** Admin-approved calories across every workout ever completed — the headline "All-Time
   * Logged" figure (see getTotalCalorieBurn(true)). */
  totalLogged: TotalCalorieBurnDTO;
}

interface LeanExerciseEntry {
  exerciseId: Types.ObjectId;
  name: string;
  targetSets: number;
  status: string;
  calorieApproved?: boolean;
  sets: { completed: boolean; weight?: number | null; assistLevel?: AssistLevel | null }[];
}

function subtract(total: CatalogCalorieEstimate | null, minus: CatalogCalorieEstimate | null): CatalogCalorieEstimate | null {
  if (!total) return null;
  if (!minus) return total;
  const minKcal = Math.max(0, total.minKcal - minus.minKcal);
  const maxKcal = Math.max(0, total.maxKcal - minus.maxKcal);
  if (minKcal === 0 && maxKcal === 0) return null;
  return { minKcal, maxKcal, kcal: Math.round((minKcal + maxKcal) / 2) };
}

/**
 * Calorie-tracking page's data: today's per-exercise breakdown (showing exactly which system —
 * the weight/bodyweight table in lib/dynamic-calorie-table.ts, or the flat catalog fallback —
 * produced each figure, and whether it's admin-approved yet), a short recent-workout history
 * split the same way, and the lifetime approved total.
 *
 * "Logged" vs "Pending" here is specific to this page: calorie burn itself is computed and
 * shown live everywhere else in the app the moment an exercise is completed (dashboard gauge,
 * exercise detail) — see lib/calories-burned.ts. Only this page's headline figures wait for an
 * admin to actually approve the exercise's XP award before counting it as official.
 */
export async function getCalorieTrackingData(): Promise<CalorieTrackingDTO> {
  const user = await requireUserDoc();
  const bodyWeightKg = user.weightKg ?? null;

  const [todayWorkout, historyWorkouts, totalLogged] = await Promise.all([
    DailyWorkout.findOne({ userId: user._id, date: todayKey() }).lean(),
    DailyWorkout.find({ userId: user._id, type: "workout", status: "complete" })
      .sort({ date: -1 })
      .limit(HISTORY_LIMIT)
      .select("date workoutName exercises.exerciseId exercises.status exercises.sets exercises.calorieApproved")
      .lean(),
    getTotalCalorieBurn(true),
  ]);

  const exerciseIds = new Set<string>();
  if (todayWorkout) for (const e of todayWorkout.exercises) exerciseIds.add(e.exerciseId.toString());
  for (const w of historyWorkouts) for (const e of w.exercises) exerciseIds.add(e.exerciseId.toString());

  const catalogDocs = await Exercise.find({ _id: { $in: Array.from(exerciseIds) } })
    .select("slug calorieBurnMin calorieBurnMax")
    .lean();
  const byId = new Map(catalogDocs.map((d) => [d._id.toString(), d]));

  function joinRow(e: LeanExerciseEntry): ExerciseCalorieInput {
    const doc = byId.get(e.exerciseId.toString());
    return {
      status: e.status,
      slug: doc?.slug ?? "",
      calorieBurnMin: doc?.calorieBurnMin ?? null,
      calorieBurnMax: doc?.calorieBurnMax ?? null,
      loggedWeightKg: averageLoggedWeightKg(e.sets),
      assistLevel: modeAssistLevel(e.sets),
    };
  }

  /** All completed exercises split into logged (approved) vs pending (not yet), summed. */
  function loggedAndPending(entries: LeanExerciseEntry[]): { logged: CatalogCalorieEstimate | null; pending: CatalogCalorieEstimate | null } {
    const joined = entries.map((e) => joinRow(e));
    const all = sumCompletedExerciseCalories(joined, bodyWeightKg);
    const approvedOnly = entries.map((e, i) => (e.calorieApproved ? joined[i] : null)).filter((j): j is ExerciseCalorieInput => j != null);
    const logged = sumCompletedExerciseCalories(approvedOnly, bodyWeightKg);
    return { logged, pending: subtract(all, logged) };
  }

  let today: CalorieTrackingTodayDTO | null = null;
  if (todayWorkout && todayWorkout.type === "workout") {
    const joined = todayWorkout.exercises.map((e) => joinRow(e));

    const exercises: CalorieExerciseRowDTO[] = todayWorkout.exercises.map((e, i) => {
      const j = joined[i];
      const dynamic =
        dynamicCalorieRangeFor(j.slug, j.loggedWeightKg, bodyWeightKg) ??
        assistLevelCalorieRangeFor(j.slug, j.assistLevel, bodyWeightKg) ??
        bodyWeightOnlyCalorieRangeFor(j.slug, bodyWeightKg);
      const usesCatalog = !dynamic && j.calorieBurnMin != null && j.calorieBurnMax != null;
      const minKcal = dynamic?.min ?? (usesCatalog ? j.calorieBurnMin : null);
      const maxKcal = dynamic?.max ?? (usesCatalog ? j.calorieBurnMax : null);

      return {
        name: e.name,
        status: e.status,
        targetSets: e.targetSets,
        loggedWeightKg: j.loggedWeightKg,
        assistLevel: j.assistLevel,
        source: dynamic ? "dynamic" : usesCatalog ? "catalog" : "unavailable",
        weightTierLabel: dynamic?.weightTierLabel ?? null,
        bodyWeightBandLabel: dynamic?.bodyWeightBandLabel ?? null,
        minKcal,
        maxKcal,
        kcal: minKcal != null && maxKcal != null ? Math.round((minKcal + maxKcal) / 2) : null,
        approved: e.status === "complete" && !!e.calorieApproved,
      };
    });

    const { logged, pending } = loggedAndPending(todayWorkout.exercises);

    today = {
      workoutName: todayWorkout.workoutName,
      type: todayWorkout.type,
      exercises,
      logged,
      pending,
      target: sumAllExerciseCalories(joined, bodyWeightKg),
    };
  }

  const history: CalorieTrackingHistoryRowDTO[] = historyWorkouts.map((w) => {
    const { logged, pending } = loggedAndPending(w.exercises);
    return { date: w.date, workoutName: w.workoutName, logged, pending };
  });

  return { hasBodyWeight: bodyWeightKg != null, today, history, totalLogged };
}
