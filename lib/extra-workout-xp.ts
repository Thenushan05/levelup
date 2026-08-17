/**
 * XP scoring for extra ("overtime") workouts logged outside the routine.
 *
 * Hitting the guidance weight for your bodyweight/height scores the base 5 XP. Every 25% of
 * volume above par adds 2 XP, up to a per-entry cap that depends on the exercise class so
 * isolation work can't pay like a compound lift. The daily cap in lib/xp.ts then keeps a day of
 * extras below what the actual routine is worth.
 *
 * All inputs are server-verified — the client never supplies an XP amount.
 */

import {
  matchStandard,
  parWeightFor,
  heightMultiplierFor,
  type ExerciseClass,
} from "@/lib/strength-standards";

export type ExtraWorkoutCategory = "weight_training" | "cardio" | "abs";

export type CardioIntensity = "light" | "moderate" | "intense";

export const CARDIO_MET: Record<CardioIntensity, number> = {
  light: 3.5,
  moderate: 7,
  intense: 10,
};

export const BASE_EXTRA_XP = 5;

/** Per-entry ceiling by exercise class. */
export const CLASS_XP_CAP: Record<ExerciseClass, number> = {
  compound: 25,
  secondary: 15,
  isolation: 10,
  abs: 12,
  cardio: 20,
};

/** Volume above par needed for each +2 XP step. */
const RATIO_STEP = 0.25;
const XP_PER_STEP = 2;

export interface BodyStats {
  weightKg: number | null;
  heightCm: number | null;
}

export interface ExtraWorkoutInput {
  category: ExtraWorkoutCategory;
  name: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  durationSec?: number | null;
  intensity?: CardioIntensity | null;
}

export interface XpBreakdown {
  xp: number;
  /** Guidance weight this member was scored against, null for bodyweight-only work. */
  parWeightKg: number | null;
  /** Actual volume / par volume. 1.0 means exactly at guidance. */
  ratio: number;
  cap: number;
  /** Set when body stats are missing and the flat base award was used instead. */
  missingBodyStats: boolean;
  estimatedCalories: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function xpFromRatio(ratio: number, cap: number): number {
  const steps = Math.floor(Math.max(0, ratio - 1) / RATIO_STEP);
  return clamp(BASE_EXTRA_XP + steps * XP_PER_STEP, BASE_EXTRA_XP, cap);
}

function scoreWeightTraining(input: ExtraWorkoutInput, stats: BodyStats): XpBreakdown {
  const standard = matchStandard(input.name, "secondary");
  const cap = CLASS_XP_CAP[standard.exerciseClass];
  const bodyWeight = stats.weightKg!;

  const par = parWeightFor(standard, bodyWeight, stats.heightCm);
  // Per-side standards describe one dumbbell/handle, so double it to compare total load.
  // No load logged means bodyweight-only work (pull-ups, dips, air squats) — treat it as
  // exactly par so the entry is scored purely on sets and reps instead of an invented number.
  const effectiveWeight =
    input.weightKg && input.weightKg > 0
      ? standard.perSide
        ? input.weightKg * 2
        : input.weightKg
      : par.totalKg;

  const sets = input.sets ?? standard.defaultSets;
  const reps = input.reps ?? standard.defaultReps;

  // par.totalKg already carries the height multiplier, so the ratio must not apply it again —
  // doing so cancels it out and makes height meaningless.
  const parVolume = standard.defaultSets * standard.defaultReps * par.totalKg;
  const actualVolume = sets * reps * effectiveWeight;

  const ratio = parVolume > 0 ? actualVolume / parVolume : 1;

  return {
    xp: xpFromRatio(ratio, cap),
    parWeightKg: par.perSide ? par.perSideKg : par.totalKg,
    ratio,
    cap,
    missingBodyStats: false,
    estimatedCalories: null,
  };
}

function scoreCardio(input: ExtraWorkoutInput, stats: BodyStats): XpBreakdown {
  const cap = CLASS_XP_CAP.cardio;
  const met = CARDIO_MET[input.intensity ?? "moderate"];
  const minutes = input.durationMin ?? 0;

  // Standard MET equation — heavier members genuinely burn more moving the same distance.
  const kcal = (met * 3.5 * stats.weightKg!) / 200 * minutes;
  const xp = clamp(BASE_EXTRA_XP + Math.floor(kcal / 60), BASE_EXTRA_XP, cap);

  return {
    xp,
    parWeightKg: null,
    ratio: 1,
    cap,
    missingBodyStats: false,
    estimatedCalories: Math.round(kcal),
  };
}

function scoreAbs(input: ExtraWorkoutInput, stats: BodyStats): XpBreakdown {
  const standard = matchStandard(input.name, "abs");
  const cap = CLASS_XP_CAP.abs;

  const sets = input.sets ?? standard.defaultSets;

  // Held positions (plank) are measured in seconds, everything else in reps. Convert whichever
  // the member logged into the unit the standard is written in, at ~3 seconds per rep of work,
  // so a textbook 3x45s plank scores exactly par instead of a third of it.
  let perSet: number;
  if (standard.repsAreSeconds) {
    perSet = input.durationSec ?? (input.reps != null ? input.reps * 3 : standard.defaultReps);
  } else {
    perSet = input.durationSec != null ? input.durationSec / 3 : (input.reps ?? standard.defaultReps);
  }

  // Height raises the bar here exactly as it does for weight training — longer levers move
  // through more range, so par grows with the member rather than the credit they earn.
  const parReps = standard.defaultSets * standard.defaultReps * heightMultiplierFor(stats.heightCm);
  const actualReps = sets * perSet;
  const ratio = parReps > 0 ? actualReps / parReps : 1;

  // Loaded core work (weighted twists, cable chops) can only ever add on top.
  const weightStep = stats.weightKg! * 0.12;
  const weightBonus = input.weightKg && weightStep > 0 ? Math.floor(input.weightKg / weightStep) : 0;

  return {
    xp: clamp(xpFromRatio(ratio, cap) + weightBonus, BASE_EXTRA_XP, cap),
    parWeightKg: null,
    ratio,
    cap,
    missingBodyStats: false,
    estimatedCalories: null,
  };
}

/**
 * Members who haven't saved body stats yet get the flat base award — there is no safe way to
 * scale without a real bodyweight, and guessing one would hand out inflated XP.
 */
export function computeExtraWorkoutXp(input: ExtraWorkoutInput, stats: BodyStats): XpBreakdown {
  if (stats.weightKg == null || stats.weightKg <= 0) {
    return {
      xp: BASE_EXTRA_XP,
      parWeightKg: null,
      ratio: 1,
      cap: BASE_EXTRA_XP,
      missingBodyStats: true,
      estimatedCalories: null,
    };
  }

  switch (input.category) {
    case "cardio":
      return scoreCardio(input, stats);
    case "abs":
      return scoreAbs(input, stats);
    default:
      return scoreWeightTraining(input, stats);
  }
}

/**
 * Guidance weight to show in the form before anything is logged, so a member knows what "normal"
 * looks like for them. Null for bodyweight-only or cardio work.
 */
export function guidanceWeightFor(name: string, stats: BodyStats): number | null {
  if (stats.weightKg == null || stats.weightKg <= 0) return null;
  const standard = matchStandard(name, "secondary");
  if (standard.loadFactor <= 0) return null;
  const par = parWeightFor(standard, stats.weightKg, stats.heightCm);
  return par.perSide ? par.perSideKg : par.totalKg;
}
