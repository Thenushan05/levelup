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
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { slug: "bench-press", name: "Bench Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "incline-dumbbell-press", name: "Incline Dumbbell Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "seated-cable-row", name: "Seated Cable Row", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15 },
  { slug: "tricep-pushdown", name: "Tricep Pushdown", muscleGroup: "Triceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "dumbbell-curl", name: "Dumbbell Curl", muscleGroup: "Biceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15 },

  { slug: "squat", name: "Squat", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "Hamstrings", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "leg-press", name: "Leg Press", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "leg-curl", name: "Leg Curl", muscleGroup: "Hamstrings", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "calf-raise", name: "Calf Raise", muscleGroup: "Calves", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15 },
  { slug: "plank", name: "Plank", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 30, defaultRepsMax: 60 },

  { slug: "pull-ups", name: "Pull Ups", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 6, defaultRepsMax: 12 },
  { slug: "shoulder-press", name: "Shoulder Press", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "chest-press", name: "Chest Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "one-arm-dumbbell-row", name: "One Arm Dumbbell Row", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", muscleGroup: "Shoulders", defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15 },
  { slug: "hammer-curl", name: "Hammer Curl", muscleGroup: "Biceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "overhead-tricep-extension", name: "Overhead Tricep Extension", muscleGroup: "Triceps", defaultSets: 2, defaultRepsMin: 10, defaultRepsMax: 15 },

  { slug: "goblet-squat", name: "Goblet Squat", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12 },
  { slug: "hip-thrust", name: "Hip Thrust", muscleGroup: "Glutes", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "walking-lunges", name: "Walking Lunges", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 10 },
  { slug: "leg-extension", name: "Leg Extension", muscleGroup: "Legs", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },
  { slug: "leg-raise", name: "Leg Raise", muscleGroup: "Core", defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15 },

  { slug: "split-squat", name: "Split Squat", muscleGroup: "Legs", defaultSets: 2, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "bench-press-machine-chest-press", name: "Bench Press / Machine Chest Press", muscleGroup: "Chest", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
  { slug: "pull-ups-assisted-pull-ups", name: "Pull Ups / Assisted Pull Ups", muscleGroup: "Back", defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12 },
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

// NSCA-style 3-day full-body split: balanced upper/lower work, core training,
// moderate loads, sensible progression. Non-workout days carry no exercises —
// their label alone drives the "rest" / "optional" UI copy (see daily-quest-card.tsx).
export const SLEEPER_BUILD_SCHEDULE: ScheduleDaySpec[] = [
  {
    dayOfWeek: 1,
    label: "Full Body A",
    type: "workout",
    exercises: [
      { slug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "bench-press-machine-chest-press", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "lat-pulldown", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "romanian-deadlift", sets: 2, repsMin: 8, repsMax: 12 },
      { slug: "lateral-raise", sets: 2, repsMin: 10, repsMax: 15 },
      { slug: "plank", sets: 3, repsMin: 30, repsMax: 60, repsUnit: "seconds" },
    ],
  },
  { dayOfWeek: 2, label: "Light Activity", type: "optional", exercises: [] },
  {
    dayOfWeek: 3,
    label: "Full Body B",
    type: "workout",
    exercises: [
      { slug: "leg-press", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "incline-dumbbell-press", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "seated-cable-row", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "split-squat", sets: 2, repsMin: 8, repsMax: 12, perSide: true },
      { slug: "dumbbell-curl", sets: 2, repsMin: 10, repsMax: 15 },
      { slug: "tricep-pushdown", sets: 2, repsMin: 10, repsMax: 15 },
    ],
  },
  { dayOfWeek: 4, label: "Recovery Day", type: "rest", exercises: [] },
  {
    dayOfWeek: 5,
    label: "Full Body C",
    type: "workout",
    exercises: [
      { slug: "squat", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "pull-ups-assisted-pull-ups", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "shoulder-press", sets: 3, repsMin: 8, repsMax: 12 },
      { slug: "leg-curl", sets: 2, repsMin: 10, repsMax: 15 },
      { slug: "calf-raise", sets: 2, repsMin: 10, repsMax: 15 },
      { slug: "leg-raise", sets: 3, repsMin: 10, repsMax: 15 },
    ],
  },
  { dayOfWeek: 6, label: "Optional Activity", type: "optional", exercises: [] },
  { dayOfWeek: 0, label: "Recovery Day", type: "rest", exercises: [] },
];

let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await connectToDatabase();

  const exerciseDocs = await Promise.all(
    EXERCISE_CATALOG.map((ex) =>
      Exercise.findOneAndUpdate(
        { slug: ex.slug },
        { $setOnInsert: { ...ex, isBuiltIn: true } },
        { upsert: true, returnDocument: "after" }
      )
    )
  );
  const idBySlug = new Map(exerciseDocs.map((doc) => [doc.slug, doc._id]));

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

  await WorkoutTemplate.findOneAndUpdate(
    { slug: "sleeper-build" },
    {
      $setOnInsert: {
        name: "Sleeper Build",
        slug: "sleeper-build",
        description:
          "NSCA-style 3-day full-body routine — balanced upper/lower work, core training, moderate loads, and sensible progression.",
        daysPerWeek: 3,
        isBuiltIn: true,
        schedule,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  await ensureAchievementsSeeded();

  seeded = true;
}
