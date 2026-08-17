/**
 * Weight-lifted x bodyweight calorie-burn lookup — a fixed table, same spirit as the flat
 * per-exercise catalog range in models/Exercise.ts (calorieBurnMin/Max), just sliced finer:
 * 3 weight tiers (matched against what was actually logged on an exercise's completed sets)
 * x 5 bodyweight bands (matched against User.weightKg) -> a [min, max] kcal range straight
 * out of the source table. No formula, no interpolation between cells.
 *
 * Currently only populated for Monday's Push Focus day (Sleeper Build). Every other exercise
 * has no entry here, so lib/calories-burned.ts's lookup falls back to the flat catalog range
 * exactly as before — this table only ever narrows an estimate, never removes one.
 */

interface KcalRange {
  min: number;
  max: number;
}

interface WeightTier {
  /** Display label straight from the source table, e.g. "10–15 kg each". */
  label: string;
  /** Upper bound (kg) of this tier, inclusive. Infinity for the open-ended top tier. */
  maxKg: number;
  /** Aligned by index to CALORIE_BODYWEIGHT_BANDS. */
  byBodyWeightBand: KcalRange[];
}

export interface CalorieBodyWeightBand {
  label: string;
  minKg: number;
  /** null on the top band — open-ended (100kg+). */
  maxKg: number | null;
}

export const CALORIE_BODYWEIGHT_BANDS: CalorieBodyWeightBand[] = [
  { label: "50–59 kg", minKg: 50, maxKg: 59 },
  { label: "60–69 kg", minKg: 60, maxKg: 69 },
  { label: "70–79 kg", minKg: 70, maxKg: 79 },
  { label: "80–89 kg", minKg: 80, maxKg: 89 },
  { label: "90–100 kg", minKg: 90, maxKg: null },
];

function bodyWeightBandIndex(bodyWeightKg: number): number {
  for (let i = 0; i < CALORIE_BODYWEIGHT_BANDS.length - 1; i++) {
    if (bodyWeightKg <= CALORIE_BODYWEIGHT_BANDS[i].maxKg!) return i;
  }
  return CALORIE_BODYWEIGHT_BANDS.length - 1;
}

function weightTierIndex(tiers: WeightTier[], weightKg: number): number {
  for (let i = 0; i < tiers.length; i++) {
    if (weightKg <= tiers[i].maxKg) return i;
  }
  return tiers.length - 1;
}

/** Keyed by Exercise.slug. Monday — Push Focus (Sleeper Build). */
const DYNAMIC_CALORIE_TABLE: Record<string, WeightTier[]> = {
  "incline-dumbbell-press": [
    {
      label: "5–10 kg each",
      maxKg: 10,
      byBodyWeightBand: [{ min: 16, max: 23 }, { min: 19, max: 27 }, { min: 22, max: 31 }, { min: 25, max: 35 }, { min: 28, max: 39 }],
    },
    {
      label: "10–15 kg each",
      maxKg: 15,
      byBodyWeightBand: [{ min: 19, max: 28 }, { min: 23, max: 33 }, { min: 26, max: 37 }, { min: 30, max: 42 }, { min: 34, max: 48 }],
    },
    {
      label: "15–20+ kg each",
      maxKg: Infinity,
      byBodyWeightBand: [{ min: 23, max: 32 }, { min: 27, max: 38 }, { min: 31, max: 44 }, { min: 35, max: 50 }, { min: 39, max: 56 }],
    },
  ],
  "lateral-raise": [
    {
      label: "2–4 kg each",
      maxKg: 4,
      byBodyWeightBand: [{ min: 18, max: 24 }, { min: 21, max: 29 }, { min: 24, max: 33 }, { min: 28, max: 38 }, { min: 31, max: 42 }],
    },
    {
      label: "4–6 kg each",
      maxKg: 6,
      byBodyWeightBand: [{ min: 21, max: 29 }, { min: 25, max: 35 }, { min: 29, max: 40 }, { min: 32, max: 45 }, { min: 36, max: 50 }],
    },
    {
      label: "6–10 kg each",
      maxKg: Infinity,
      byBodyWeightBand: [{ min: 24, max: 34 }, { min: 29, max: 40 }, { min: 33, max: 46 }, { min: 38, max: 52 }, { min: 42, max: 59 }],
    },
  ],
  "shoulder-press": [
    {
      label: "10–20 kg",
      maxKg: 20,
      byBodyWeightBand: [{ min: 16, max: 23 }, { min: 19, max: 27 }, { min: 22, max: 31 }, { min: 25, max: 35 }, { min: 28, max: 39 }],
    },
    {
      label: "20–30 kg",
      maxKg: 30,
      byBodyWeightBand: [{ min: 19, max: 28 }, { min: 23, max: 33 }, { min: 26, max: 37 }, { min: 30, max: 42 }, { min: 34, max: 48 }],
    },
    {
      label: "30–45+ kg",
      maxKg: Infinity,
      byBodyWeightBand: [{ min: 23, max: 32 }, { min: 27, max: 38 }, { min: 31, max: 44 }, { min: 35, max: 50 }, { min: 39, max: 56 }],
    },
  ],
  "cable-chest-fly": [
    {
      label: "5–10 kg/side",
      maxKg: 10,
      byBodyWeightBand: [{ min: 15, max: 20 }, { min: 17, max: 24 }, { min: 20, max: 28 }, { min: 22, max: 31 }, { min: 25, max: 35 }],
    },
    {
      label: "10–15 kg/side",
      maxKg: 15,
      byBodyWeightBand: [{ min: 18, max: 24 }, { min: 21, max: 29 }, { min: 24, max: 33 }, { min: 28, max: 38 }, { min: 31, max: 42 }],
    },
    {
      label: "15–25+ kg/side",
      maxKg: Infinity,
      byBodyWeightBand: [{ min: 20, max: 29 }, { min: 24, max: 35 }, { min: 28, max: 40 }, { min: 31, max: 45 }, { min: 35, max: 50 }],
    },
  ],
  "tricep-pushdown": [
    {
      label: "10–20 kg",
      maxKg: 20,
      byBodyWeightBand: [{ min: 15, max: 19 }, { min: 17, max: 23 }, { min: 20, max: 26 }, { min: 22, max: 30 }, { min: 25, max: 34 }],
    },
    {
      label: "20–30 kg",
      maxKg: 30,
      byBodyWeightBand: [{ min: 17, max: 23 }, { min: 20, max: 28 }, { min: 23, max: 32 }, { min: 26, max: 36 }, { min: 29, max: 41 }],
    },
    {
      label: "30–45+ kg",
      maxKg: Infinity,
      byBodyWeightBand: [{ min: 19, max: 28 }, { min: 23, max: 33 }, { min: 26, max: 37 }, { min: 30, max: 42 }, { min: 34, max: 48 }],
    },
  ],
};

/** True for any exercise slug this table covers. Lets callers distinguish "dynamic lookup
 * legitimately unavailable" (missing weight/bodyweight) from "this exercise isn't in the
 * table at all" without re-deriving it from a null result. */
export function hasDynamicCalorieData(slug: string): boolean {
  return slug in DYNAMIC_CALORIE_TABLE;
}

export interface DynamicCalorieMatch extends KcalRange {
  /** Which weight bracket the logged weight matched, e.g. "10–15 kg each". */
  weightTierLabel: string;
  /** Which bodyweight band the user's weight matched, e.g. "70–79 kg". */
  bodyWeightBandLabel: string;
}

/**
 * Looks up the calorie range for one completed exercise from the weight-lifted x bodyweight
 * table. Returns null if this exercise isn't in the table, or either input is missing —
 * callers should fall back to the flat catalog range in that case.
 */
export function dynamicCalorieRangeFor(
  slug: string,
  loggedWeightKg: number | null,
  bodyWeightKg: number | null
): DynamicCalorieMatch | null {
  const tiers = DYNAMIC_CALORIE_TABLE[slug];
  if (!tiers || loggedWeightKg == null || bodyWeightKg == null) return null;

  const tier = tiers[weightTierIndex(tiers, loggedWeightKg)];
  const bandIndex = bodyWeightBandIndex(bodyWeightKg);
  const range = tier.byBodyWeightBand[bandIndex];
  if (!range) return null;

  return {
    ...range,
    weightTierLabel: tier.label,
    bodyWeightBandLabel: CALORIE_BODYWEIGHT_BANDS[bandIndex].label,
  };
}
