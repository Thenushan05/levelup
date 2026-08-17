/**
 * Weight-lifted x bodyweight calorie-burn lookup — a fixed table, same spirit as the flat
 * per-exercise catalog range in models/Exercise.ts (calorieBurnMin/Max), just sliced finer:
 * 3 weight tiers (matched against what was actually logged on an exercise's completed sets)
 * x a handful of bodyweight bands (matched against User.weightKg) -> a [min, max] kcal range
 * straight out of the source table. No formula, no interpolation between cells.
 *
 * Currently populated for Monday's Push Focus, Tuesday's Pull Focus, Wednesday's Detail
 * Sculpt, and Friday's Legs & Abs days (Sleeper Build). Every other exercise has no entry here,
 * so lib/calories-burned.ts's lookup falls back to the flat catalog range exactly as before —
 * this table only ever narrows an estimate, never removes one.
 *
 * Bodyweight bands are defined per exercise (BANDS_4 / BANDS_5 below), not globally: a later
 * revision merged the old 80–89/90–100 split into one 80–100 band. Monday, Tuesday, Wednesday,
 * and Friday have all received that revision, so everything currently in this table uses
 * BANDS_4 — BANDS_5 is kept only in case an un-revised day (Saturday) arrives in the original
 * shape later.
 *
 * A tier's byBodyWeightBand entry can be `null` where the source table simply never provided a
 * number for that weight-tier x bodyweight-band cell — every exercise revised so far only got a
 * 60–69kg row for its 2nd/3rd weight tier (see cable-chest-fly / tricep-pushdown on Monday,
 * seated-cable-row / face-pull / dumbbell-curl / hammer-curl on Tuesday, incline-dumbbell-fly /
 * lean-away-lateral-raise / overhead-tricep-extension / cable-woodchopper / the light_assist
 * and bodyweight assist levels on Wednesday, and leg-press / romanian-deadlift / leg-curl /
 * calf-raise on Friday) — that cell falls back to the flat catalog range rather than guessing.
 *
 * Two exercises don't fit the numeric-weight-tier shape above:
 *
 * - Assisted/Bodyweight Pull-Ups: its source table's tiers are assistance weight, which runs
 *   backwards from every other exercise here (MORE assistance kg means LESS effort and LOWER
 *   calories), and it has no numeric weight input in the quest UI at all (see
 *   usesWeightTracking() in lib/weight-guidance.ts). It gets its own
 *   ASSIST_LEVEL_CALORIE_TABLE + assistLevelCalorieRangeFor() below instead, keyed by a 3-way
 *   "how much did the machine help" selector rather than a typed number.
 *
 * - Hanging Knee Raise: no weight dimension at all — one kcal range per bodyweight band, no
 *   tiers to pick between. It gets BODYWEIGHT_ONLY_CALORIE_TABLE + bodyWeightOnlyCalorieRangeFor()
 *   instead, needing only bodyWeightKg.
 *
 * Note: Standing Calf Raise looks similar (its base tier is literally "Bodyweight") but isn't
 * one of these exceptions — it still has a numeric weight input and two more tiers for added
 * load, so it stays in the main DYNAMIC_CALORIE_TABLE with its "Bodyweight" tier's maxKg set to
 * 0. That means a set logged with weight exactly 0 matches it; leaving the field blank instead
 * (no weight logged at all) falls back to the flat catalog range like anywhere else.
 */

import type { AssistLevel } from "@/types";
export type { AssistLevel };

interface KcalRange {
  min: number;
  max: number;
}

interface WeightTier {
  /** Display label straight from the source table, e.g. "10–15 kg each". */
  label: string;
  /** Upper bound (kg) of this tier, inclusive. Infinity for the open-ended top tier. */
  maxKg: number;
  /** Aligned by index to this exercise's `bands` (see ExerciseCalorieEntry). `null` = the
   * source table never gave a number for this cell — falls back to the flat catalog range. */
  byBodyWeightBand: (KcalRange | null)[];
}

export interface CalorieBodyWeightBand {
  label: string;
  minKg: number;
  /** null on the top band — open-ended. */
  maxKg: number | null;
}

/**
 * Original 5-band scale. No exercise uses this anymore as of the Wednesday revision — Monday,
 * Tuesday, and Wednesday have all since moved to BANDS_4 below — but it's kept rather than
 * deleted in case Friday/Saturday (not yet revised) arrive in this original shape.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
const BANDS_5: CalorieBodyWeightBand[] = [
  { label: "50–59 kg", minKg: 50, maxKg: 59 },
  { label: "60–69 kg", minKg: 60, maxKg: 69 },
  { label: "70–79 kg", minKg: 70, maxKg: 79 },
  { label: "80–89 kg", minKg: 80, maxKg: 89 },
  { label: "90–100 kg", minKg: 90, maxKg: null },
];

/** Revised 4-band scale — now Monday, Tuesday, and Wednesday (merges the old 80–89/90–100 split
 * into one 80–100 band). */
const BANDS_4: CalorieBodyWeightBand[] = [
  { label: "50–59 kg", minKg: 50, maxKg: 59 },
  { label: "60–69 kg", minKg: 60, maxKg: 69 },
  { label: "70–79 kg", minKg: 70, maxKg: 79 },
  { label: "80–100 kg", minKg: 80, maxKg: null },
];

interface ExerciseCalorieEntry {
  bands: CalorieBodyWeightBand[];
  tiers: WeightTier[];
}

function bandIndex(bands: CalorieBodyWeightBand[], bodyWeightKg: number): number {
  for (let i = 0; i < bands.length - 1; i++) {
    if (bodyWeightKg <= bands[i].maxKg!) return i;
  }
  return bands.length - 1;
}

function weightTierIndex(tiers: WeightTier[], weightKg: number): number {
  for (let i = 0; i < tiers.length; i++) {
    if (weightKg <= tiers[i].maxKg) return i;
  }
  return tiers.length - 1;
}

/** Keyed by Exercise.slug. */
const DYNAMIC_CALORIE_TABLE: Record<string, ExerciseCalorieEntry> = {
  // Monday — Push Focus (Sleeper Build). BANDS_4 (see file header for why this differs from
  // Tuesday/Wednesday below).
  "incline-dumbbell-press": {
    bands: BANDS_4,
    tiers: [
      { label: "5–10 kg each", maxKg: 10, byBodyWeightBand: [{ min: 16, max: 25 }, { min: 20, max: 30 }, { min: 22, max: 34 }, { min: 26, max: 42 }] },
      { label: "10–15 kg each", maxKg: 15, byBodyWeightBand: [{ min: 20, max: 29 }, { min: 25, max: 35 }, { min: 28, max: 40 }, { min: 33, max: 50 }] },
      { label: "15–20+ kg each", maxKg: Infinity, byBodyWeightBand: [{ min: 24, max: 34 }, { min: 30, max: 40 }, { min: 34, max: 46 }, { min: 39, max: 57 }] },
    ],
  },
  "lateral-raise": {
    bands: BANDS_4,
    tiers: [
      { label: "2–4 kg each", maxKg: 4, byBodyWeightBand: [{ min: 17, max: 25 }, { min: 20, max: 30 }, { min: 23, max: 34 }, { min: 27, max: 43 }] },
      { label: "4–6 kg each", maxKg: 6, byBodyWeightBand: [{ min: 21, max: 29 }, { min: 25, max: 35 }, { min: 28, max: 40 }, { min: 33, max: 50 }] },
      { label: "6–10 kg each", maxKg: Infinity, byBodyWeightBand: [{ min: 25, max: 34 }, { min: 30, max: 40 }, { min: 34, max: 46 }, { min: 39, max: 57 }] },
    ],
  },
  "shoulder-press": {
    bands: BANDS_4,
    tiers: [
      { label: "10–20 kg", maxKg: 20, byBodyWeightBand: [{ min: 16, max: 25 }, { min: 20, max: 30 }, { min: 22, max: 34 }, { min: 26, max: 43 }] },
      { label: "20–30 kg", maxKg: 30, byBodyWeightBand: [{ min: 20, max: 29 }, { min: 25, max: 35 }, { min: 28, max: 40 }, { min: 33, max: 50 }] },
      { label: "30–45+ kg", maxKg: Infinity, byBodyWeightBand: [{ min: 24, max: 34 }, { min: 30, max: 40 }, { min: 34, max: 46 }, { min: 39, max: 57 }] },
    ],
  },
  // Tiers 2/3 are missing 50–59, 70–79, and 80–100 cells in the source table — only the 60–69
  // row was given. Those missing cells are `null` and fall back to the flat catalog range
  // until the rest of the rows are supplied.
  "cable-chest-fly": {
    bands: BANDS_4,
    tiers: [
      { label: "5–10 kg/side", maxKg: 10, byBodyWeightBand: [{ min: 15, max: 22 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "10–15 kg/side", maxKg: 15, byBodyWeightBand: [null, { min: 22, max: 30 }, null, null] },
      { label: "15–25+ kg/side", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },
  "tricep-pushdown": {
    bands: BANDS_4,
    tiers: [
      { label: "10–20 kg", maxKg: 20, byBodyWeightBand: [{ min: 15, max: 22 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "20–30 kg", maxKg: 30, byBodyWeightBand: [null, { min: 22, max: 30 }, null, null] },
      { label: "30–45+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },

  // Tuesday — Pull Focus (Sleeper Build). Revised to BANDS_4, same as Monday. Seated Cable
  // Row/Face Pull/DB Bicep Curl/Hammer Curl have the same "only 60–69kg given" gap on their
  // 2nd/3rd tiers as Monday's Cable Chest Fly/Triceps Pushdown — see the file header.
  "lat-pulldown": {
    bands: BANDS_4,
    tiers: [
      { label: "20–30 kg", maxKg: 30, byBodyWeightBand: [{ min: 20, max: 29 }, { min: 25, max: 35 }, { min: 28, max: 40 }, { min: 33, max: 50 }] },
      { label: "30–45 kg", maxKg: 45, byBodyWeightBand: [{ min: 24, max: 34 }, { min: 30, max: 40 }, { min: 34, max: 46 }, { min: 39, max: 57 }] },
      { label: "45–60+ kg", maxKg: Infinity, byBodyWeightBand: [{ min: 28, max: 38 }, { min: 35, max: 45 }, { min: 40, max: 52 }, { min: 46, max: 64 }] },
    ],
  },
  "seated-cable-row": {
    bands: BANDS_4,
    tiers: [
      { label: "20–30 kg", maxKg: 30, byBodyWeightBand: [{ min: 16, max: 25 }, { min: 20, max: 30 }, { min: 22, max: 34 }, { min: 26, max: 43 }] },
      { label: "30–45 kg", maxKg: 45, byBodyWeightBand: [null, { min: 25, max: 35 }, null, null] },
      { label: "45–60+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 30, max: 40 }, null, null] },
    ],
  },
  "face-pull": {
    bands: BANDS_4,
    tiers: [
      { label: "5–15 kg", maxKg: 15, byBodyWeightBand: [{ min: 17, max: 25 }, { min: 20, max: 30 }, { min: 23, max: 34 }, { min: 27, max: 43 }] },
      { label: "15–25 kg", maxKg: 25, byBodyWeightBand: [null, { min: 25, max: 35 }, null, null] },
      { label: "25–35+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 30, max: 40 }, null, null] },
    ],
  },
  "dumbbell-curl": {
    bands: BANDS_4,
    tiers: [
      { label: "4–6 kg each", maxKg: 6, byBodyWeightBand: [{ min: 15, max: 21 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "6–10 kg each", maxKg: 10, byBodyWeightBand: [null, { min: 20, max: 30 }, null, null] },
      { label: "10–15+ kg each", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 35 }, null, null] },
    ],
  },
  "hammer-curl": {
    bands: BANDS_4,
    tiers: [
      { label: "5–7.5 kg each", maxKg: 7.5, byBodyWeightBand: [{ min: 15, max: 21 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "7.5–12.5 kg each", maxKg: 12.5, byBodyWeightBand: [null, { min: 22, max: 30 }, null, null] },
      { label: "12.5–17.5+ kg each", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },

  // Wednesday — Detail Sculpt (Sleeper Build). Revised to BANDS_4, same as Monday/Tuesday.
  // Assisted/Bodyweight Pull-Ups deliberately has no entry here — see
  // ASSIST_LEVEL_CALORIE_TABLE below instead. The other 4 have the same "only 60–69kg given"
  // gap on their 2nd/3rd tiers as everything else revised so far.
  "incline-dumbbell-fly": {
    bands: BANDS_4,
    tiers: [
      { label: "3–5 kg each", maxKg: 5, byBodyWeightBand: [{ min: 15, max: 22 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "5–10 kg each", maxKg: 10, byBodyWeightBand: [null, { min: 22, max: 30 }, null, null] },
      { label: "10–15+ kg each", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },
  "lean-away-lateral-raise": {
    bands: BANDS_4,
    tiers: [
      { label: "2.5–5 kg", maxKg: 5, byBodyWeightBand: [{ min: 16, max: 23 }, { min: 20, max: 28 }, { min: 23, max: 32 }, { min: 27, max: 40 }] },
      { label: "5–7.5 kg", maxKg: 7.5, byBodyWeightBand: [null, { min: 24, max: 32 }, null, null] },
      { label: "7.5–12.5+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 28, max: 40 }, null, null] },
    ],
  },
  "overhead-tricep-extension": {
    bands: BANDS_4,
    tiers: [
      { label: "5–10 kg", maxKg: 10, byBodyWeightBand: [{ min: 15, max: 22 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "10–15 kg", maxKg: 15, byBodyWeightBand: [null, { min: 22, max: 30 }, null, null] },
      { label: "15–25+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },
  "cable-woodchopper": {
    bands: BANDS_4,
    tiers: [
      { label: "5–10 kg", maxKg: 10, byBodyWeightBand: [{ min: 18, max: 25 }, { min: 22, max: 30 }, { min: 25, max: 34 }, { min: 29, max: 43 }] },
      { label: "10–20 kg", maxKg: 20, byBodyWeightBand: [null, { min: 27, max: 38 }, null, null] },
      { label: "20–30+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 32, max: 45 }, null, null] },
    ],
  },

  // Friday — Legs & Abs (Sleeper Build). BANDS_4, same "only 60–69kg given" gap on 2nd/3rd
  // tiers as everything else. Hanging Knee Raise deliberately has no entry here — it's a
  // bodyweight-only movement with no weight tiers at all, see BODYWEIGHT_ONLY_CALORIE_TABLE
  // below instead.
  "leg-press": {
    bands: BANDS_4,
    tiers: [
      { label: "40–70 kg", maxKg: 70, byBodyWeightBand: [{ min: 20, max: 29 }, { min: 25, max: 35 }, { min: 28, max: 40 }, { min: 33, max: 50 }] },
      { label: "70–110 kg", maxKg: 110, byBodyWeightBand: [null, { min: 30, max: 42 }, null, null] },
      { label: "110–160+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 35, max: 50 }, null, null] },
    ],
  },
  "romanian-deadlift": {
    bands: BANDS_4,
    tiers: [
      { label: "7.5–12.5 kg each", maxKg: 12.5, byBodyWeightBand: [{ min: 18, max: 25 }, { min: 22, max: 30 }, { min: 25, max: 34 }, { min: 29, max: 43 }] },
      { label: "12.5–20 kg each", maxKg: 20, byBodyWeightBand: [null, { min: 27, max: 38 }, null, null] },
      { label: "20–30+ kg each", maxKg: Infinity, byBodyWeightBand: [null, { min: 32, max: 45 }, null, null] },
    ],
  },
  "leg-curl": {
    bands: BANDS_4,
    tiers: [
      { label: "10–20 kg", maxKg: 20, byBodyWeightBand: [{ min: 16, max: 23 }, { min: 20, max: 28 }, { min: 23, max: 32 }, { min: 27, max: 40 }] },
      { label: "20–35 kg", maxKg: 35, byBodyWeightBand: [null, { min: 24, max: 34 }, null, null] },
      { label: "35–50+ kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 28, max: 40 }, null, null] },
    ],
  },
  // Unlike every other numeric-weight exercise, tier 1 here is "no added load" rather than a
  // missing/unlogged weight — a set logged with weight exactly 0 (not left blank) matches it.
  // Leaving the field blank still falls back to the flat catalog range, same as any other
  // exercise with no weight logged yet.
  "calf-raise": {
    bands: BANDS_4,
    tiers: [
      { label: "Bodyweight", maxKg: 0, byBodyWeightBand: [{ min: 15, max: 21 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }] },
      { label: "BW +10–30 kg", maxKg: 30, byBodyWeightBand: [null, { min: 20, max: 30 }, null, null] },
      { label: "BW +30–60 kg", maxKg: Infinity, byBodyWeightBand: [null, { min: 25, max: 38 }, null, null] },
    ],
  },
};

/** True for any exercise slug this table covers. Lets callers distinguish "dynamic lookup
 * legitimately unavailable" (missing weight/bodyweight, or a not-yet-supplied cell) from "this
 * exercise isn't in the table at all" without re-deriving it from a null result. */
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
 * table. Returns null if this exercise isn't in the table, either input is missing, or the
 * matched cell hasn't been supplied yet (see the `null` cells on cable-chest-fly/
 * tricep-pushdown above) — callers should fall back to the flat catalog range in that case.
 */
export function dynamicCalorieRangeFor(
  slug: string,
  loggedWeightKg: number | null,
  bodyWeightKg: number | null
): DynamicCalorieMatch | null {
  const entry = DYNAMIC_CALORIE_TABLE[slug];
  if (!entry || loggedWeightKg == null || bodyWeightKg == null) return null;

  const tier = entry.tiers[weightTierIndex(entry.tiers, loggedWeightKg)];
  const bIdx = bandIndex(entry.bands, bodyWeightKg);
  const range = tier.byBodyWeightBand[bIdx];
  if (!range) return null;

  return {
    ...range,
    weightTierLabel: tier.label,
    bodyWeightBandLabel: entry.bands[bIdx].label,
  };
}

// --- Hanging Knee Raise: bodyweight-only, no weight tier at all ----------------------------
//
// Unlike every exercise above, this one has no weight dimension whatsoever — it's Core muscle
// group and already has no weight input in the quest UI (see usesWeightTracking() in
// lib/weight-guidance.ts), and its source table gives exactly one row per bodyweight band, no
// tiers to pick between. So the estimate needs only bodyWeightKg, nothing typed or selected.

interface BodyWeightOnlyEntry {
  bands: CalorieBodyWeightBand[];
  /** Aligned by index to `bands`. `null` = not yet supplied, falls back to the flat catalog range. */
  byBodyWeightBand: (KcalRange | null)[];
}

const BODYWEIGHT_ONLY_CALORIE_TABLE: Record<string, BodyWeightOnlyEntry> = {
  "hanging-leg-raise": {
    bands: BANDS_4,
    byBodyWeightBand: [{ min: 15, max: 21 }, { min: 18, max: 28 }, { min: 21, max: 32 }, { min: 25, max: 40 }],
  },
};

/** True for any exercise slug the bodyweight-only table covers. */
export function hasBodyWeightOnlyCalorieData(slug: string): boolean {
  return slug in BODYWEIGHT_ONLY_CALORIE_TABLE;
}

/**
 * Looks up the calorie range for one completed bodyweight-only exercise, keyed purely by
 * bodyweight — no logged weight or selector needed. Returns null if this exercise isn't in the
 * table, bodyweight is missing, or the matched band hasn't been supplied yet — callers should
 * fall back to the flat catalog range in that case.
 */
export function bodyWeightOnlyCalorieRangeFor(slug: string, bodyWeightKg: number | null): DynamicCalorieMatch | null {
  const entry = BODYWEIGHT_ONLY_CALORIE_TABLE[slug];
  if (!entry || bodyWeightKg == null) return null;

  const bIdx = bandIndex(entry.bands, bodyWeightKg);
  const range = entry.byBodyWeightBand[bIdx];
  if (!range) return null;

  return {
    ...range,
    weightTierLabel: "Bodyweight",
    bodyWeightBandLabel: entry.bands[bIdx].label,
  };
}

// --- Assisted/Bodyweight Pull-Ups: assistance-level selector instead of a typed weight -----

interface AssistTier {
  level: AssistLevel;
  /** Button label in the quest UI. */
  buttonLabel: string;
  /** Display label straight from the source table, e.g. "30–50 kg assistance". */
  rangeLabel: string;
  /** Aligned by index to BANDS_4, same revised scale as Monday/Tuesday/the rest of Wednesday.
   * `null` = not yet supplied by the source table for that band, same convention as
   * WeightTier's byBodyWeightBand — falls back to the flat catalog range. */
  byBodyWeightBand: (KcalRange | null)[];
}

/** Ordered easiest -> hardest, matching the source table and the button row's left-to-right
 * layout — NOT ordered by kcal, since more assistance means lower calories, not higher. */
export const ASSIST_LEVEL_OPTIONS: { level: AssistLevel; buttonLabel: string }[] = [
  { level: "heavy_assist", buttonLabel: "Heavy Assist" },
  { level: "light_assist", buttonLabel: "Light Assist" },
  { level: "bodyweight", buttonLabel: "Bodyweight" },
];

export function assistLevelLabel(level: AssistLevel): string {
  return ASSIST_LEVEL_OPTIONS.find((o) => o.level === level)?.buttonLabel ?? level;
}

const ASSIST_LEVEL_CALORIE_TABLE: Record<string, AssistTier[]> = {
  "pull-ups-assisted-pull-ups": [
    {
      level: "heavy_assist",
      buttonLabel: "Heavy Assist",
      rangeLabel: "30–50 kg assistance",
      byBodyWeightBand: [{ min: 15, max: 22 }, { min: 18, max: 25 }, { min: 20, max: 29 }, { min: 24, max: 36 }],
    },
    {
      level: "light_assist",
      buttonLabel: "Light Assist",
      rangeLabel: "10–30 kg assistance",
      byBodyWeightBand: [null, { min: 23, max: 33 }, null, null],
    },
    {
      level: "bodyweight",
      buttonLabel: "Bodyweight",
      rangeLabel: "Bodyweight pull-up",
      byBodyWeightBand: [null, { min: 28, max: 40 }, null, null],
    },
  ],
};

/** True for any exercise slug the assist-level table covers — lets the quest UI decide whether
 * to render the 3-way selector instead of (or in addition to checking) hasDynamicCalorieData(). */
export function hasAssistLevelData(slug: string): boolean {
  return slug in ASSIST_LEVEL_CALORIE_TABLE;
}

/**
 * Looks up the calorie range for one completed assisted-pull-up-style exercise from the
 * assistance-level table. Returns null if this exercise isn't in the table, or either input
 * is missing — callers should fall back to the flat catalog range in that case.
 */
export function assistLevelCalorieRangeFor(
  slug: string,
  assistLevel: AssistLevel | null,
  bodyWeightKg: number | null
): DynamicCalorieMatch | null {
  const tiers = ASSIST_LEVEL_CALORIE_TABLE[slug];
  if (!tiers || assistLevel == null || bodyWeightKg == null) return null;

  const tier = tiers.find((t) => t.level === assistLevel);
  if (!tier) return null;

  const bIdx = bandIndex(BANDS_4, bodyWeightKg);
  const range = tier.byBodyWeightBand[bIdx];
  if (!range) return null;

  return {
    ...range,
    weightTierLabel: tier.rangeLabel,
    bodyWeightBandLabel: BANDS_4[bIdx].label,
  };
}
