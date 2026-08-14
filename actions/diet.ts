"use server";

import { revalidatePath } from "next/cache";
import { DailyWorkout } from "@/models/DailyWorkout";
import { requireUserDoc } from "@/lib/session";
import { todayKey, addDays, durationMinutes as computeDurationMinutes } from "@/lib/dates";
import { bodyStatsSchema, type BodyStatsInput } from "@/lib/validations/onboarding";
import {
  calculateBmi,
  buildDietPlan,
  FOOD_GUIDANCE,
  type BmiResult,
  type DietPlan,
  type BiologicalSex,
  type FitnessGoal,
  type UnitSystem,
} from "@/lib/nutrition";
import {
  estimateWorkoutCalories,
  caloriesBurnedSoFar,
  lightActivityCalorieRange,
  type WorkoutCalorieEstimate,
} from "@/lib/calories-burned";

export type CaloriePhase = "completed" | "in_progress" | "projected";

export interface WorkoutCalorieRowDTO extends WorkoutCalorieEstimate {
  date: string;
  workoutName: string;
  phase: CaloriePhase;
}

export interface TotalBurnDTO {
  totalKcal: number;
  totalWorkouts: number;
  totalMinutes: number;
}

export interface DietProfileDTO {
  hasBodyStats: boolean;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  biologicalSex: BiologicalSex | null;
  fitnessGoal: FitnessGoal | null;
  unitSystem: UnitSystem;
  bmi: BmiResult | null;
  dietPlan: DietPlan | null;
  foodGuidance: typeof FOOD_GUIDANCE;
  recentBurn: WorkoutCalorieRowDTO[];
  todayEstimate: WorkoutCalorieRowDTO | null;
  totalBurn: TotalBurnDTO | null;
  lightActivityRange: { low: number; high: number } | null;
}

export async function getDietProfile(): Promise<DietProfileDTO> {
  const user = await requireUserDoc();

  const hasBodyStats = user.weightKg != null && user.heightCm != null && user.age != null && !!user.biologicalSex;

  let bmi: BmiResult | null = null;
  let dietPlan: DietPlan | null = null;
  let lightActivityRange: { low: number; high: number } | null = null;

  if (hasBodyStats) {
    bmi = calculateBmi(user.weightKg!, user.heightCm!);
    lightActivityRange = lightActivityCalorieRange(user.weightKg!);
    if (user.fitnessGoal) {
      dietPlan = buildDietPlan(
        {
          weightKg: user.weightKg!,
          heightCm: user.heightCm!,
          age: user.age!,
          biologicalSex: user.biologicalSex as BiologicalSex,
        },
        user.daysPerWeek ?? 3,
        user.fitnessGoal as FitnessGoal
      );
    }
  }

  const today = todayKey();
  const recentBurn: WorkoutCalorieRowDTO[] = [];
  let todayEstimate: WorkoutCalorieRowDTO | null = null;

  if (hasBodyStats) {
    const weekAgo = addDays(today, -6);
    const workouts = await DailyWorkout.find({ userId: user._id, date: { $gte: weekAgo, $lte: today } })
      .sort({ date: -1 })
      .lean();

    for (const w of workouts) {
      const isComplete = w.status === "complete";
      const isToday = w.date === today;

      let estimate: WorkoutCalorieEstimate | null;
      let phase: CaloriePhase;

      if (isComplete) {
        const realMinutes = computeDurationMinutes(w.startedAt ?? null, w.completedAt ?? null);
        estimate = estimateWorkoutCalories({ weightKg: user.weightKg!, type: w.type, totalSets: w.totalSets, durationMinutes: realMinutes });
        phase = "completed";
      } else if (isToday && w.startedAt) {
        // Real elapsed time so far — climbs as sets get logged, not a guess.
        estimate = caloriesBurnedSoFar({ weightKg: user.weightKg!, type: w.type, startedAt: w.startedAt, asOf: new Date() });
        phase = "in_progress";
      } else if (isToday) {
        // Not started yet — no real elapsed time exists, so this is a projection.
        estimate = estimateWorkoutCalories({ weightKg: user.weightKg!, type: w.type, totalSets: w.totalSets, durationMinutes: null });
        phase = "projected";
      } else {
        continue;
      }

      if (!estimate) continue;
      const row: WorkoutCalorieRowDTO = { date: w.date, workoutName: w.workoutName, phase, ...estimate };
      if (isToday) {
        todayEstimate = row;
      } else if (isComplete) {
        recentBurn.push(row);
      }
    }
  }

  // Lifetime total — same MET/real-duration formula as today's/recent
  // estimates above (not the fixed-catalog sum the dashboard gauge uses),
  // so this stays consistent with the numbers right above it on this page.
  // Uses current bodyweight throughout, same simplification the 7-day
  // figures already make — no historical weight-per-workout is tracked.
  let totalBurn: TotalBurnDTO | null = null;
  if (hasBodyStats) {
    const allCompleted = await DailyWorkout.find({ userId: user._id, type: "workout", status: "complete" })
      .select("totalSets startedAt completedAt")
      .lean();

    let totalKcal = 0;
    let totalMinutes = 0;
    let totalWorkouts = 0;
    for (const w of allCompleted) {
      const realMinutes = computeDurationMinutes(w.startedAt ?? null, w.completedAt ?? null);
      const estimate = estimateWorkoutCalories({
        weightKg: user.weightKg!,
        type: "workout",
        totalSets: w.totalSets,
        durationMinutes: realMinutes,
      });
      if (!estimate) continue;
      totalKcal += estimate.kcal;
      totalMinutes += estimate.minutes;
      totalWorkouts += 1;
    }
    totalBurn = { totalKcal, totalWorkouts, totalMinutes };
  }

  return {
    hasBodyStats,
    weightKg: user.weightKg ?? null,
    heightCm: user.heightCm ?? null,
    age: user.age ?? null,
    biologicalSex: (user.biologicalSex as BiologicalSex) ?? null,
    fitnessGoal: (user.fitnessGoal as FitnessGoal) ?? null,
    unitSystem: (user.unitSystem as UnitSystem) ?? "metric",
    bmi,
    dietPlan,
    foodGuidance: FOOD_GUIDANCE,
    recentBurn,
    todayEstimate,
    totalBurn,
    lightActivityRange,
  };
}

export async function updateBodyStats(input: BodyStatsInput) {
  const parsed = bodyStatsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();
  user.weightKg = parsed.data.weightKg;
  user.heightCm = parsed.data.heightCm;
  user.age = parsed.data.age;
  user.biologicalSex = parsed.data.biologicalSex;
  user.fitnessGoal = parsed.data.fitnessGoal;
  user.unitSystem = parsed.data.unitSystem;
  await user.save();

  revalidatePath("/diet");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true as const };
}
