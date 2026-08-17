/**
 * Bodyweight-scaled suggested-weight lookup. Each exercise carries a fixed-length array of
 * display strings aligned by index to BODYWEIGHT_BANDS, and pickWeightGuidance() picks the
 * one matching a user's saved weightKg (User.weightKg, collected at onboarding).
 */

export interface BodyWeightBand {
  label: string;
  minKg: number;
  /** null on the top band — open-ended (100kg+). */
  maxKg: number | null;
}

export const BODYWEIGHT_BANDS: BodyWeightBand[] = [
  { label: "45–55 kg", minKg: 45, maxKg: 55 },
  { label: "55–65 kg", minKg: 55, maxKg: 65 },
  { label: "65–75 kg", minKg: 65, maxKg: 75 },
  { label: "75–85 kg", minKg: 75, maxKg: 85 },
  { label: "85–100 kg", minKg: 85, maxKg: 100 },
  { label: "100+ kg", minKg: 100, maxKg: null },
];

/** Index into BODYWEIGHT_BANDS (and any exercise's weightGuidance array) for a given body weight. */
export function bandIndexForBodyWeight(bodyWeightKg: number): number {
  for (let i = 0; i < BODYWEIGHT_BANDS.length - 1; i++) {
    if (bodyWeightKg < BODYWEIGHT_BANDS[i].maxKg!) return i;
  }
  return BODYWEIGHT_BANDS.length - 1;
}

/** Returns the display string for this user's band, or null if there's no data or no saved body weight. */
export function pickWeightGuidance(
  weightGuidance: string[] | null | undefined,
  bodyWeightKg: number | null | undefined
): string | null {
  if (!weightGuidance?.length || bodyWeightKg == null) return null;
  const band = bandIndexForBodyWeight(bodyWeightKg);
  return weightGuidance[band] ?? null;
}

/**
 * Whether an exercise entry should ask for a KG figure at all. Cardio and core work is
 * unloaded, so a weight field only produces meaningless zeroes — and pull-ups (bodyweight,
 * or assisted via a counterweight machine that offsets the user's own weight) carry no
 * user-entered load either, regardless of muscle group.
 */
export function usesWeightTracking(exercise: {
  muscleGroup: string;
  repsUnit: "reps" | "seconds";
  name: string;
}): boolean {
  if (exercise.repsUnit === "seconds") return false;
  if (exercise.muscleGroup === "Cardio" || exercise.muscleGroup === "Core") return false;
  if (/pull-up/i.test(exercise.name)) return false;
  return true;
}
