import { connectToDatabase } from "@/lib/mongodb";
import { Exercise } from "@/models/Exercise";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { ensureAchievementsSeeded } from "@/lib/achievements";

interface CatalogExercise {
  slug: string;
  name: string;
  muscleGroup: string;
  defaultSets: number;
  defaultRepsMin: number;
  defaultRepsMax: number;
  /** Path under /public, e.g. "/exercises/bench-press.jpg". Drop the file in public/exercises/. */
  imageUrl?: string;
  /** 6 entries aligned to BODYWEIGHT_BANDS in lib/weight-guidance.ts. Omit for bodyweight-only moves. */
  weightGuidance?: string[];
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { slug: "bench-press", name: "Bench Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "lat-pulldown", name: "Lat Pulldown — Wide Grip", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, weightGuidance: ["15–20 kg", "20–25 kg", "25–30 kg", "27.5–35 kg", "30–40 kg", "35–45 kg"] },
  { slug: "incline-dumbbell-press", name: "Incline Dumbbell Bench Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, imageUrl: "/exercises/incline-dumbbell-press.png", weightGuidance: ["5–7 kg", "6–8 kg", "8–10 kg", "9–12 kg", "10–14 kg", "12–16 kg"] },
  { slug: "seated-cable-row", name: "Seated Cable Rows — Neutral Grip", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, weightGuidance: ["15–20 kg", "20–25 kg", "25–30 kg", "27.5–35 kg", "30–40 kg", "35–45 kg"] },
  { slug: "lateral-raise", name: "Dumbbell Lateral Raises", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, imageUrl: "/exercises/lateral-raise.png", weightGuidance: ["2–3 kg", "2–4 kg", "3–4 kg", "3–5 kg", "4–6 kg", "4–7 kg"] },
  { slug: "tricep-pushdown", name: "Triceps Cable Pushdowns", muscleGroup: "Triceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15, imageUrl: "/exercises/tricep-pushdown.png", weightGuidance: ["7.5–10 kg", "10–12.5 kg", "12.5–15 kg", "15–20 kg", "17.5–22.5 kg", "20–25 kg"] },
  { slug: "dumbbell-curl", name: "Dumbbell Bicep Curls", muscleGroup: "Biceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15, weightGuidance: ["3–5 kg", "4–6 kg", "6–8 kg", "7–9 kg", "8–10 kg", "9–12 kg"] },

  { slug: "squat", name: "Squat", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "romanian-deadlift", name: "Romanian Dumbbell Deadlifts", muscleGroup: "Hamstrings", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, weightGuidance: ["5–7 kg each", "6–9 kg", "8–10 kg", "9–12 kg", "10–15 kg", "12–18 kg"] },
  { slug: "leg-press", name: "Leg Press Machine", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, weightGuidance: ["25–35 kg", "30–45 kg", "40–50 kg", "45–60 kg", "50–70 kg", "60–80 kg"] },
  { slug: "leg-curl", name: "Lying Leg Curls", muscleGroup: "Hamstrings", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, weightGuidance: ["10–15 kg", "15–20 kg", "20–25 kg", "22.5–30 kg", "25–35 kg", "30–40 kg"] },
  { slug: "calf-raise", name: "Standing Calf Raises", muscleGroup: "Calves", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, weightGuidance: ["Bodyweight / 5 kg", "5–8 kg", "10 kg", "10–15 kg", "12–20 kg", "15–25 kg"] },
  { slug: "plank", name: "Plank", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 30, defaultRepsMax: 60 },

  { slug: "pull-ups", name: "Pull Ups", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 6, defaultRepsMax: 12 },
  { slug: "shoulder-press", name: "Seated Shoulder Press Machine", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, imageUrl: "/exercises/shoulder-press.png", weightGuidance: ["10–15 kg", "12.5–17.5 kg", "15–20 kg", "17.5–25 kg", "20–30 kg", "25–35 kg"] },
  { slug: "chest-press", name: "Chest Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "one-arm-dumbbell-row", name: "One Arm Dumbbell Row", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15 },
  { slug: "hammer-curl", name: "Hammer Curls", muscleGroup: "Biceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15, weightGuidance: ["4–5 kg", "5–7 kg", "6–8 kg", "7–10 kg", "8–12 kg", "10–14 kg"] },
  { slug: "overhead-tricep-extension", name: "Overhead Dumbbell Triceps Extension", muscleGroup: "Triceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15, weightGuidance: ["5–7 kg", "6–8 kg", "8–10 kg", "9–12 kg", "10–14 kg", "12–16 kg"] },

  { slug: "goblet-squat", name: "Goblet Squat", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "hip-thrust", name: "Hip Thrust", muscleGroup: "Glutes", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "walking-lunges", name: "Walking Lunges", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 10 },
  { slug: "leg-extension", name: "Leg Extension", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "leg-raise", name: "Leg Raise", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },

  { slug: "split-squat", name: "Split Squat", muscleGroup: "Legs", defaultSets: 2, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "bench-press-machine-chest-press", name: "Bench Press / Machine Chest Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "pull-ups-assisted-pull-ups", name: "Bodyweight / Assisted Pull-Ups", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },

  // Sleeper Build v2 — Push/Pull/Detail/Legs/Cardio 5-day split
  { slug: "cable-chest-fly", name: "Cable Chest Flyes", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, imageUrl: "/exercises/cable-chest-fly.png", weightGuidance: ["2.5–5 kg/side", "4–6 kg", "5–7.5 kg", "6–8 kg", "7.5–10 kg", "7.5–12.5 kg"] },
  { slug: "face-pull", name: "Cable Face Pulls", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, weightGuidance: ["5–7.5 kg", "7.5–10 kg", "10–12.5 kg", "10–15 kg", "12.5–17.5 kg", "15–20 kg"] },
  { slug: "incline-dumbbell-fly", name: "Dumbbell Incline Flyes", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, weightGuidance: ["2–4 kg", "3–5 kg", "4–6 kg", "5–7 kg", "6–8 kg", "6–10 kg"] },
  { slug: "lean-away-lateral-raise", name: "Lean-Away Cable Lateral Raises", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, weightGuidance: ["1.5–2.5 kg", "2–3.5 kg", "2.5–5 kg", "3–5 kg", "4–6 kg", "4–7.5 kg"] },
  { slug: "cable-woodchopper", name: "Cable Woodchoppers", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, weightGuidance: ["4–5 kg", "5–7.5 kg", "5–7.5 kg", "7.5–10 kg", "7.5–12.5 kg", "10–15 kg"] },
  { slug: "hanging-leg-raise", name: "Hanging Leg / Knee Raises", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "incline-treadmill-walk", name: "Incline Treadmill Walk", muscleGroup: "Cardio", defaultSets: 1, defaultRepsMin: 20, defaultRepsMax: 30 },
  { slug: "russian-twist", name: "Russian Twists", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 15, defaultRepsMax: 20 },
];

interface ScheduleExerciseSpec {
  slug: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  repsUnit?: "reps" | "seconds";
  perSide?: boolean;
}

interface ScheduleDaySpec {
  dayOfWeek: number;
  label: string;
  type: "workout" | "rest" | "optional";
  exercises: ScheduleExerciseSpec[];
}

// Sleeper Build v2 — 5-day Push/Pull/Detail-Sculpt/Legs/Cardio split targeting a
// slim, athletic "sleeper build" look (visible shoulders, upper chest, V-taper,
// defined arms, athletic legs) without maximizing bodybuilding-style size.
// Thursday & Sunday are full rest. Non-workout days carry no exercises — their
// label alone drives the "rest" / "optional" UI copy (see daily-quest-card.tsx).
export const SLEEPER_BUILD_SCHEDULE: ScheduleDaySpec[] = [
  {
    dayOfWeek: 1,
    label: "Push Focus",
    type: "workout",
    exercises: [
      { slug: "incline-dumbbell-press", sets: 3, repsMin: 10, repsMax: 12 },
      { slug: "lateral-raise", sets: 4, repsMin: 12, repsMax: 15 },
      { slug: "shoulder-press", sets: 3, repsMin: 10, repsMax: 12 },
      { slug: "cable-chest-fly", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "tricep-pushdown", sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    dayOfWeek: 2,
    label: "Pull Focus",
    type: "workout",
    exercises: [
      { slug: "lat-pulldown", sets: 4, repsMin: 10, repsMax: 12 },
      { slug: "seated-cable-row", sets: 3, repsMin: 10, repsMax: 12 },
      { slug: "face-pull", sets: 4, repsMin: 15, repsMax: 15 },
      { slug: "dumbbell-curl", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "hammer-curl", sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    dayOfWeek: 3,
    label: "Detail Sculpt",
    type: "workout",
    exercises: [
      { slug: "pull-ups-assisted-pull-ups", sets: 3, repsMin: 8, repsMax: 10 },
      { slug: "incline-dumbbell-fly", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "lean-away-lateral-raise", sets: 3, repsMin: 15, repsMax: 15, perSide: true },
      { slug: "overhead-tricep-extension", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "cable-woodchopper", sets: 3, repsMin: 12, repsMax: 15, perSide: true },
    ],
  },
  { dayOfWeek: 4, label: "Recovery Day", type: "rest", exercises: [] },
  {
    dayOfWeek: 5,
    label: "Legs & Abs",
    type: "workout",
    exercises: [
      { slug: "leg-press", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "romanian-deadlift", sets: 3, repsMin: 10, repsMax: 12 },
      { slug: "leg-curl", sets: 3, repsMin: 12, repsMax: 15 },
      { slug: "calf-raise", sets: 3, repsMin: 15, repsMax: 15 },
      { slug: "hanging-leg-raise", sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    dayOfWeek: 6,
    label: "Cardio & Core",
    type: "workout",
    exercises: [
      { slug: "incline-treadmill-walk", sets: 1, repsMin: 30, repsMax: 30 },
      { slug: "plank", sets: 3, repsMin: 60, repsMax: 60, repsUnit: "seconds" },
      { slug: "russian-twist", sets: 3, repsMin: 20, repsMax: 20 },
    ],
  },
  { dayOfWeek: 0, label: "Recovery Day", type: "rest", exercises: [] },
];

let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await connectToDatabase();

  // name/muscleGroup/defaultSets/defaultRepsMin/defaultRepsMax are $set (not $setOnInsert):
  // like the built-in template below, this is the source-controlled definition of a catalog
  // exercise, so it re-syncs on every restart instead of freezing after first insert. imageUrl
  // is deliberately excluded here — it's backfilled separately below (fill-if-missing only) so
  // an admin-set image is never clobbered by a catalog default.
  const exerciseDocs = await Promise.all(
    EXERCISE_CATALOG.map((ex) =>
      Exercise.findOneAndUpdate(
        { slug: ex.slug },
        {
          $set: {
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            defaultSets: ex.defaultSets,
            defaultRepsMin: ex.defaultRepsMin,
            defaultRepsMax: ex.defaultRepsMax,
            weightGuidance: ex.weightGuidance ?? [],
          },
          $setOnInsert: { slug: ex.slug, isBuiltIn: true },
        },
        { upsert: true, returnDocument: "after" }
      )
    )
  );
  const idBySlug = new Map(exerciseDocs.map((doc) => [doc.slug, doc._id]));

  // Backfill catalog images onto exercises that were already seeded before an
  // imageUrl existed for them. Only fills in a missing image — never
  // overwrites one an admin has already set via the template editor.
  await Promise.all(
    EXERCISE_CATALOG.filter((ex) => ex.imageUrl).map((ex) =>
      Exercise.updateOne({ slug: ex.slug, imageUrl: null }, { $set: { imageUrl: ex.imageUrl } })
    )
  );

  // Disabled for now — keeping only "Sleeper Build — Athletic" (a separate, admin-managed
  // template) as the active built-in. This used to auto-create/sync a second "Sleeper Build"
  // template on every request; that document was deleted from the DB and its users repointed
  // to sleeper-build-athletic. Re-enable by flipping this flag back to true — the code below
  // is otherwise untouched and will re-sync it exactly as before.
  const SEED_BUILT_IN_SLEEPER_BUILD = false;
  if (SEED_BUILT_IN_SLEEPER_BUILD) {
    const schedule = SLEEPER_BUILD_SCHEDULE.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      type: day.type,
      exercises: day.exercises.map((ex) => {
        const catalogEntry = EXERCISE_CATALOG.find((c) => c.slug === ex.slug)!;
        return {
          exerciseId: idBySlug.get(ex.slug),
          name: catalogEntry.name,
          muscleGroup: catalogEntry.muscleGroup,
          targetSets: ex.sets,
          targetRepsMin: ex.repsMin,
          targetRepsMax: ex.repsMax,
          repsUnit: ex.repsUnit ?? "reps",
          perSide: ex.perSide ?? false,
        };
      }),
    }));

    // $set (not $setOnInsert) for the content fields: this is the shipped, source-controlled
    // definition of the built-in template, so every deploy re-syncs it to whatever's in this
    // file — unlike a user-created template, it's not meant to drift from the code. Only the
    // identity fields (slug/isBuiltIn) are insert-only.
    await WorkoutTemplate.findOneAndUpdate(
      { slug: "sleeper-build" },
      {
        $set: {
          name: "Sleeper Build",
          description:
            "5-day Push/Pull/Detail-Sculpt/Legs/Cardio split for a slim, athletic sleeper-build physique — moderate loads, controlled tempo, and sensible progression. Rest on Thursday and Sunday.",
          daysPerWeek: 5,
          schedule,
        },
        $setOnInsert: {
          slug: "sleeper-build",
          isBuiltIn: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  }

  await ensureAchievementsSeeded();

  seeded = true;
}
