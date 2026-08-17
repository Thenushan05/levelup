/**
 * Fitness-game guidance values — NOT medical or scientifically exact strength standards.
 *
 * Rather than storing a manual table for every bodyweight x height x exercise combination,
 * each exercise stores a single load factor and the "par" (normal/expected) working weight is
 * derived: bodyWeight * loadFactor * heightMultiplier. That covers every possible member
 * automatically while still allowing per-exercise overrides later.
 *
 * Bodyweight is the dominant factor; height only nudges the result by +/-9% across the whole
 * range, because a 190cm lifter should not be expected to move 20-30% more than a 170cm one.
 */

export type ExerciseClass = "compound" | "secondary" | "isolation" | "abs" | "cardio";

export interface WeightBand {
  group: string;
  minKg: number;
  /** null on the top band — open-ended. */
  maxKg: number | null;
  /** Representative bodyweight used for display tables. */
  midpointKg: number;
}

export const WEIGHT_BANDS: WeightBand[] = [
  { group: "W1", minKg: 50, maxKg: 60, midpointKg: 55 },
  { group: "W2", minKg: 60, maxKg: 70, midpointKg: 65 },
  { group: "W3", minKg: 70, maxKg: 80, midpointKg: 75 },
  { group: "W4", minKg: 80, maxKg: 90, midpointKg: 85 },
  { group: "W5", minKg: 90, maxKg: 100, midpointKg: 95 },
  { group: "W6", minKg: 100, maxKg: 110, midpointKg: 105 },
  { group: "W7", minKg: 110, maxKg: 120, midpointKg: 115 },
  { group: "W8", minKg: 120, maxKg: 130, midpointKg: 125 },
  { group: "W9", minKg: 130, maxKg: 140, midpointKg: 135 },
  { group: "W10", minKg: 140, maxKg: null, midpointKg: 145 },
];

export interface HeightBand {
  group: string;
  minCm: number;
  maxCm: number | null;
  multiplier: number;
}

export const HEIGHT_BANDS: HeightBand[] = [
  { group: "H1", minCm: 150, maxCm: 160, multiplier: 0.95 },
  { group: "H2", minCm: 160, maxCm: 170, multiplier: 0.98 },
  { group: "H3", minCm: 170, maxCm: 180, multiplier: 1.0 },
  { group: "H4", minCm: 180, maxCm: 190, multiplier: 1.03 },
  { group: "H5", minCm: 190, maxCm: 200, multiplier: 1.06 },
  { group: "H6", minCm: 200, maxCm: null, multiplier: 1.09 },
];

export function weightBandFor(bodyWeightKg: number): WeightBand {
  for (const band of WEIGHT_BANDS) {
    if (band.maxKg === null || bodyWeightKg < band.maxKg) return band;
  }
  return WEIGHT_BANDS[WEIGHT_BANDS.length - 1];
}

export function heightBandFor(heightCm: number): HeightBand {
  for (const band of HEIGHT_BANDS) {
    if (band.maxCm === null || heightCm < band.maxCm) return band;
  }
  return HEIGHT_BANDS[HEIGHT_BANDS.length - 1];
}

export function heightMultiplierFor(heightCm: number | null | undefined): number {
  if (heightCm == null) return 1.0;
  return heightBandFor(heightCm).multiplier;
}

export interface StrengthStandard {
  /** Fraction of bodyweight that represents a normal working weight. */
  loadFactor: number;
  /** When true, loadFactor describes the load on ONE side (per dumbbell / per handle). */
  perSide: boolean;
  exerciseClass: ExerciseClass;
  defaultSets: number;
  /** Midpoint of the normal working rep range, or seconds when repsAreSeconds is set. */
  defaultReps: number;
  /** Held positions (planks) are measured in seconds, so defaultReps is a duration. */
  repsAreSeconds?: boolean;
}

/**
 * Keyed by Exercise.slug where one exists, so catalog exercises resolve exactly. Free-text
 * extra workouts fall back to matchStandard() below.
 */
export const STRENGTH_STANDARDS: Record<string, StrengthStandard> = {
  squat: { loadFactor: 0.45, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "goblet-squat": { loadFactor: 0.25, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  "split-squat": { loadFactor: 0.2, perSide: true, exerciseClass: "compound", defaultSets: 2, defaultReps: 10 },
  "walking-lunges": { loadFactor: 0.2, perSide: true, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "leg-press": { loadFactor: 0.69, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 12.5 },
  "leg-extension": { loadFactor: 0.3, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 12.5 },
  "leg-curl": { loadFactor: 0.34, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 12.5 },
  "romanian-deadlift": { loadFactor: 0.29, perSide: true, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "hip-thrust": { loadFactor: 0.6, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "calf-raise": { loadFactor: 0.2, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 13.5 },

  "lat-pulldown": { loadFactor: 0.39, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "seated-cable-row": { loadFactor: 0.39, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  "one-arm-dumbbell-row": { loadFactor: 0.2, perSide: true, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  "pull-ups": { loadFactor: 1.0, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 9 },
  "pull-ups-assisted-pull-ups": { loadFactor: 1.0, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },

  "bench-press": { loadFactor: 0.4, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "chest-press": { loadFactor: 0.4, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  "bench-press-machine-chest-press": { loadFactor: 0.4, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 10 },
  "incline-dumbbell-press": { loadFactor: 0.14, perSide: true, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  "cable-chest-fly": { loadFactor: 0.098, perSide: true, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13.5 },
  "incline-dumbbell-fly": { loadFactor: 0.098, perSide: true, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13.5 },

  "shoulder-press": { loadFactor: 0.29, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 10 },
  "lateral-raise": { loadFactor: 0.054, perSide: true, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13.5 },
  "lean-away-lateral-raise": { loadFactor: 0.054, perSide: true, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13.5 },
  "rear-delt-fly": { loadFactor: 0.054, perSide: true, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13.5 },
  "face-pull": { loadFactor: 0.17, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 13.5 },

  "tricep-pushdown": { loadFactor: 0.22, perSide: false, exerciseClass: "secondary", defaultSets: 2, defaultReps: 12.5 },
  "overhead-tricep-extension": { loadFactor: 0.103, perSide: true, exerciseClass: "secondary", defaultSets: 2, defaultReps: 12.5 },
  "dumbbell-curl": { loadFactor: 0.103, perSide: true, exerciseClass: "secondary", defaultSets: 2, defaultReps: 12.5 },
  "hammer-curl": { loadFactor: 0.118, perSide: true, exerciseClass: "secondary", defaultSets: 2, defaultReps: 12.5 },

  "cable-woodchopper": { loadFactor: 0.123, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 13.5 },
  plank: { loadFactor: 0, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 45, repsAreSeconds: true },
  "leg-raise": { loadFactor: 0, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 12.5 },
  "hanging-leg-raise": { loadFactor: 0, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 12.5 },
  "russian-twist": { loadFactor: 0, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 17.5 },

  "incline-treadmill-walk": { loadFactor: 0, perSide: false, exerciseClass: "cardio", defaultSets: 1, defaultReps: 25 },
};

/** Used when a free-text extra workout doesn't map to a catalog slug. */
export const FALLBACK_STANDARD: Record<ExerciseClass, StrengthStandard> = {
  compound: { loadFactor: 0.35, perSide: false, exerciseClass: "compound", defaultSets: 3, defaultReps: 11 },
  secondary: { loadFactor: 0.25, perSide: false, exerciseClass: "secondary", defaultSets: 3, defaultReps: 12 },
  isolation: { loadFactor: 0.1, perSide: false, exerciseClass: "isolation", defaultSets: 3, defaultReps: 13 },
  abs: { loadFactor: 0, perSide: false, exerciseClass: "abs", defaultSets: 3, defaultReps: 15 },
  cardio: { loadFactor: 0, perSide: false, exerciseClass: "cardio", defaultSets: 1, defaultReps: 25 },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Best-effort slug match for free-text names typed into the extra-workout form. Falls back to
 * the class default so an unrecognised name still scores fairly rather than being rejected.
 */
export function matchStandard(name: string, fallbackClass: ExerciseClass): StrengthStandard {
  const needle = normalize(name);
  if (!needle) return FALLBACK_STANDARD[fallbackClass];

  const direct = STRENGTH_STANDARDS[needle.replace(/ /g, "-")];
  if (direct) return direct;

  for (const [slug, standard] of Object.entries(STRENGTH_STANDARDS)) {
    const slugWords = normalize(slug);
    if (needle === slugWords || needle.includes(slugWords) || slugWords.includes(needle)) {
      return standard;
    }
  }

  return FALLBACK_STANDARD[fallbackClass];
}

/** Rounds to increments people can actually load on a bar or select on a stack. */
export function roundToGymIncrement(kg: number): number {
  if (kg <= 0) return 0;
  if (kg < 10) return Math.round(kg * 2) / 2;
  if (kg < 40) return Math.round(kg);
  return Math.round(kg / 2.5) * 2.5;
}

export interface ParWeight {
  /** Load for one side when perSide, otherwise the whole implement/stack. */
  perSideKg: number | null;
  /** Total system load — what the XP engine compares against. */
  totalKg: number;
  perSide: boolean;
}

/**
 * baseParWeight = bodyWeight * loadFactor
 * heightAdjusted = baseParWeight * heightMultiplier
 * finalPar = roundToGymIncrement(heightAdjusted)
 */
export function parWeightFor(
  standard: StrengthStandard,
  bodyWeightKg: number,
  heightCm: number | null | undefined
): ParWeight {
  const adjusted = bodyWeightKg * standard.loadFactor * heightMultiplierFor(heightCm);
  const rounded = roundToGymIncrement(adjusted);

  return {
    perSideKg: standard.perSide ? rounded : null,
    totalKg: standard.perSide ? rounded * 2 : rounded,
    perSide: standard.perSide,
  };
}
