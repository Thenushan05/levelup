// Real, citable formulas only — no invented numbers. Every constant here
// traces to a standard, published source:
//   - BMI: WHO categories (weight(kg) / height(m)^2)
//   - BMR: Mifflin-St Jeor (1990) — the equation the Academy of Nutrition
//     and Dietetics recommends over the older Harris-Benedict formula for
//     the general population.
//   - TDEE activity multipliers: standard Mifflin-St Jeor / Harris-Benedict
//     activity scaling factors.
//   - Protein target: 1.6-2.2 g/kg bodyweight is the range the ISSN position
//     stand on protein and exercise supports for resistance-training adults;
//     we use 1.8 g/kg as a middle value.
//   - Calorie deltas for cutting/bulking: 500 kcal/day ≈ 0.45 kg/week fat
//     loss (1 kg fat ≈ 7700 kcal); 300-500 kcal/day surplus is the commonly
//     cited range for lean gain without excess fat gain.
//
// None of this is personalized medical or clinical advice — it's the same
// class of general estimate every mainstream fitness calculator uses, and
// the UI must say so.

export type BiologicalSex = "male" | "female" | "unspecified";
export type FitnessGoal = "lose_weight" | "maintain" | "gain_muscle";
export type UnitSystem = "metric" | "imperial";

export interface BodyStats {
  weightKg: number;
  heightCm: number;
  age: number;
  biologicalSex: BiologicalSex;
}

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}
export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_IN;
}
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_IN;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  categoryLabel: string;
}

/** WHO adult BMI bands, in table order — single source of truth for every
 * BMI table/legend in the UI (Diet & Body page, dashboard). */
export const BMI_CATEGORY_ROWS: { category: BmiCategory; range: string; label: string }[] = [
  { category: "underweight", range: "Below 18.5", label: "Underweight" },
  { category: "normal", range: "18.5 – 24.9", label: "Healthy Weight" },
  { category: "overweight", range: "25.0 – 29.9", label: "Overweight" },
  { category: "obese", range: "30.0+", label: "Obesity" },
];

/** Color tone per category — reused by every BMI readout so a category
 * always reads the same color across the app. */
export const BMI_CATEGORY_TONE: Record<BmiCategory, string> = {
  underweight: "text-glow-violet",
  normal: "text-glow-cyan",
  overweight: "text-amber-400",
  obese: "text-destructive",
};

/** Short encouragement per category — the BMI readout should always leave
 * the player feeling like there's a next move, never just a verdict. */
export const BMI_CATEGORY_MOTIVATION: Record<BmiCategory, string> = {
  underweight: "Fuel up and lift heavy — you're building the foundation for real strength gains.",
  normal: "You're in the Healthy Weight zone — every quest you complete keeps you there. Keep it up!",
  overweight: "You're already moving the right direction — every logged workout is progress toward Healthy Weight.",
  obese: "Every quest completed is a real step forward. Consistency beats perfection — you've got this.",
};

/** Solo Leveling–flavored "System" announcement per category — used for the
 * single-condition highlight on the dashboard, where the vibe is a status
 * window arising, not a clinical readout. */
export const BMI_CATEGORY_QUOTE: Record<BmiCategory, string> = {
  underweight:
    "Arise. Even the Shadow Monarch began as nothing but bone and hunger — feed the body that will carry you to S-Rank.",
  normal: "Status: Synchronized. This is the body of a true Hunter — arise and keep pushing past the level cap.",
  overweight: "Every rank-up starts with a Hunter willing to fight today's weight. The next Gate is already open.",
  obese: "No Hunter starts at S-Rank. The System doesn't care where you began — only that you arise again.",
};

/** BMI = weight(kg) / height(m)^2 — WHO adult categories. */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const row =
    bmi < 18.5
      ? BMI_CATEGORY_ROWS[0]
      : bmi < 25
        ? BMI_CATEGORY_ROWS[1]
        : bmi < 30
          ? BMI_CATEGORY_ROWS[2]
          : BMI_CATEGORY_ROWS[3];
  return { bmi: Math.round(bmi * 10) / 10, category: row.category, categoryLabel: row.label };
}

/**
 * Mifflin-St Jeor BMR (kcal/day at total rest).
 * Male:   10*kg + 6.25*cm - 5*age + 5
 * Female: 10*kg + 6.25*cm - 5*age - 161
 * "Unspecified" uses the midpoint of the two sex-specific constants (+5 and
 * -161 average to -78) — a disclosed simplification, not a third formula.
 */
export function calculateBmr(stats: BodyStats): number {
  const base = 10 * stats.weightKg + 6.25 * stats.heightCm - 5 * stats.age;
  if (stats.biologicalSex === "male") return Math.round(base + 5);
  if (stats.biologicalSex === "female") return Math.round(base - 161);
  return Math.round(base - 78);
}

export interface ActivityLevel {
  key: string;
  label: string;
  multiplier: number;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { key: "sedentary", label: "Sedentary (0-1 training days/week)", multiplier: 1.2 },
  { key: "light", label: "Light activity (2-3 training days/week)", multiplier: 1.375 },
  { key: "moderate", label: "Moderately active (4-5 training days/week)", multiplier: 1.55 },
  { key: "very_active", label: "Very active (6-7 training days/week)", multiplier: 1.725 },
];

/**
 * Derives an activity multiplier from the player's actual training frequency
 * (daysPerWeek, already collected at onboarding) instead of asking them to
 * self-report a separate, easily-overestimated activity level — grounding
 * TDEE in real app data rather than a guess.
 */
export function activityLevelForDaysPerWeek(daysPerWeek: number): ActivityLevel {
  if (daysPerWeek <= 1) return ACTIVITY_LEVELS[0];
  if (daysPerWeek <= 3) return ACTIVITY_LEVELS[1];
  if (daysPerWeek <= 5) return ACTIVITY_LEVELS[2];
  return ACTIVITY_LEVELS[3];
}

/** TDEE = BMR * activity multiplier. */
export function calculateTdee(bmr: number, daysPerWeek: number): { tdee: number; activityLevel: ActivityLevel } {
  const activityLevel = activityLevelForDaysPerWeek(daysPerWeek);
  return { tdee: Math.round(bmr * activityLevel.multiplier), activityLevel };
}

const GOAL_CALORIE_DELTA: Record<FitnessGoal, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 350,
};

const GOAL_LABEL: Record<FitnessGoal, string> = {
  lose_weight: "Lose Weight",
  maintain: "Maintain",
  gain_muscle: "Build Muscle",
};

/** Absolute safety floors — never recommend below what public-health
 * guidance treats as a minimum, regardless of how the math works out for a
 * very light or short person. */
const MIN_SAFE_CALORIES: Record<BiologicalSex, number> = {
  male: 1500,
  female: 1200,
  unspecified: 1350,
};

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbsG: number;
  proteinKcal: number;
  fatKcal: number;
  carbsKcal: number;
}

export interface DietPlan {
  bmr: number;
  tdee: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  goalLabel: string;
  calorieTarget: number;
  calorieDelta: number;
  cappedBySafetyFloor: boolean;
  macros: MacroTargets;
}

/**
 * Full diet plan: calorie target (TDEE adjusted for goal, floored at a safe
 * minimum) plus a macro split — protein pinned to bodyweight (1.8 g/kg, the
 * middle of the ISSN-supported 1.6-2.2 g/kg range for training adults), fat
 * at 25% of total calories, carbs filling the remainder.
 */
export function buildDietPlan(stats: BodyStats, daysPerWeek: number, goal: FitnessGoal): DietPlan {
  const bmr = calculateBmr(stats);
  const { tdee, activityLevel } = calculateTdee(bmr, daysPerWeek);

  const rawTarget = tdee + GOAL_CALORIE_DELTA[goal];
  const floor = MIN_SAFE_CALORIES[stats.biologicalSex];
  const calorieTarget = Math.max(rawTarget, floor);
  const cappedBySafetyFloor = rawTarget < floor;

  const proteinG = Math.round(stats.weightKg * 1.8);
  const proteinKcal = proteinG * 4;
  const fatKcal = Math.round(calorieTarget * 0.25);
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, calorieTarget - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  return {
    bmr,
    tdee,
    activityLevel,
    goal,
    goalLabel: GOAL_LABEL[goal],
    calorieTarget: Math.round(calorieTarget),
    calorieDelta: GOAL_CALORIE_DELTA[goal],
    cappedBySafetyFloor,
    macros: { proteinG, fatG, carbsG, proteinKcal, fatKcal, carbsKcal },
  };
}

/** General food-category guidance, not a recipe book — keeps the "diet
 * plan" grounded in the real macro numbers above instead of prescribing
 * specific dishes we have no nutritional database to back up. */
export const FOOD_GUIDANCE = {
  protein: ["Chicken breast", "Fish & seafood", "Eggs", "Greek yogurt", "Tofu & tempeh", "Lentils & beans", "Lean beef"],
  carbs: ["Rice", "Oats", "Potatoes & sweet potatoes", "Whole-grain bread/pasta", "Fruit", "Quinoa"],
  fats: ["Olive oil", "Nuts & seeds", "Avocado", "Nut butter", "Fatty fish (salmon, mackerel)"],
};
