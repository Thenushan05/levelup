"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { ensureSeeded } from "@/lib/seed";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { DailyWorkout } from "@/models/DailyWorkout";
import { Exercise } from "@/models/Exercise";
import { pickWeightGuidance } from "@/lib/weight-guidance";
import { requireUserDoc } from "@/lib/session";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";
import { toPlayerSummary } from "@/lib/dto";
import { todayKey } from "@/lib/dates";
import { revalidatePath } from "next/cache";
import type { DayType } from "@/types";

export interface TemplateSummaryDTO {
  slug: string;
  name: string;
  description: string;
  daysPerWeek: number;
  dayCount: { workout: number; rest: number; optional: number };
}

/** Returns every available routine — the seeded built-ins plus anything admins have created. */
export async function getBuiltInTemplates(): Promise<TemplateSummaryDTO[]> {
  await connectToDatabase();
  await ensureSeeded();

  const templates = await WorkoutTemplate.find({}).sort({ isBuiltIn: -1, createdAt: 1 }).lean();

  return templates.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    daysPerWeek: t.daysPerWeek,
    dayCount: {
      workout: t.schedule.filter((d) => d.type === "workout").length,
      rest: t.schedule.filter((d) => d.type === "rest").length,
      optional: t.schedule.filter((d) => d.type === "optional").length,
    },
  }));
}

export async function activateTemplate(input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();
  await ensureSeeded();

  const template = await WorkoutTemplate.findOne({ slug: parsed.data.templateSlug });
  if (!template) {
    return { success: false as const, error: "That routine could not be found." };
  }

  user.experience = parsed.data.experience;
  user.daysPerWeek = parsed.data.daysPerWeek;
  user.activeTemplateId = template._id;
  user.onboardingCompleted = true;
  user.weightKg = parsed.data.weightKg;
  user.heightCm = parsed.data.heightCm;
  user.age = parsed.data.age;
  user.biologicalSex = parsed.data.biologicalSex;
  user.fitnessGoal = parsed.data.fitnessGoal;
  user.unitSystem = parsed.data.unitSystem;
  await user.save();

  revalidatePath("/dashboard");
  revalidatePath("/routine");
  revalidatePath("/quest");

  return { success: true as const, player: toPlayerSummary(user) };
}

export interface RoutineDayDTO {
  dayOfWeek: number;
  label: string;
  type: DayType;
  exercises: {
    name: string;
    muscleGroup: string;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    repsUnit: "reps" | "seconds";
    perSide: boolean;
    imageUrl: string | null;
    /** Suggested weight for this user's saved body weight, or null if no data / no saved weight. */
    suggestedWeight: string | null;
  }[];
}

export interface ActiveRoutineDTO {
  slug: string;
  name: string;
  description: string;
  schedule: RoutineDayDTO[];
}

export async function getActiveRoutineDetail(): Promise<ActiveRoutineDTO | null> {
  const user = await requireUserDoc();
  if (!user.activeTemplateId) return null;

  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return null;

  // Images and weight guidance live on the shared Exercise doc, not on the template's
  // denormalized exercise snapshot, so join them back in here (see actions/admin.ts's
  // getTemplateForEdit, which does the same for the admin editor).
  const exerciseIds = template.schedule.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
  const exerciseById = new Map(exercises.map((e) => [e._id.toString(), e]));

  return {
    slug: template.slug,
    name: template.name,
    description: template.description,
    schedule: template.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      label: d.label,
      type: d.type as DayType,
      exercises: d.exercises.map((e) => {
        const exercise = exerciseById.get(e.exerciseId.toString());
        return {
          name: e.name,
          muscleGroup: e.muscleGroup,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          repsUnit: (e.repsUnit as "reps" | "seconds") ?? "reps",
          perSide: e.perSide ?? false,
          imageUrl: exercise?.imageUrl ?? null,
          suggestedWeight: pickWeightGuidance(exercise?.weightGuidance, user.weightKg),
        };
      }),
    })),
  };
}

/**
 * Lets an onboarded player switch their active routine to any available
 * template at any time — not just during onboarding.
 *
 * Today's quest updates immediately to match the new template IF nothing
 * has been logged on it yet (untouched, not_started, no sets). If you've
 * already checked in, opened an exercise, or completed anything today,
 * that record is left exactly as it is — switching never discards real
 * progress. Quest-log history is never touched either way.
 */
export async function switchTemplate(templateSlug: string) {
  const user = await requireUserDoc();
  await ensureSeeded();

  const template = await WorkoutTemplate.findOne({ slug: templateSlug });
  if (!template) {
    return { success: false as const, error: "That routine could not be found." };
  }

  user.activeTemplateId = template._id;
  user.daysPerWeek = template.daysPerWeek;
  await user.save();

  const today = todayKey();
  const todaysWorkout = await DailyWorkout.findOne({ userId: user._id, date: today });

  let todayRegenerated = false;
  let todayKeptProgress = false;

  if (todaysWorkout) {
    const untouched =
      todaysWorkout.completedExercises === 0 && todaysWorkout.completedSets === 0 && !todaysWorkout.startedAt;
    if (untouched) {
      await DailyWorkout.deleteOne({ _id: todaysWorkout._id });
      todayRegenerated = true;
    } else {
      todayKeptProgress = true;
    }
  }

  revalidatePath("/routine");
  revalidatePath("/dashboard");
  revalidatePath("/quest");

  return { success: true as const, player: toPlayerSummary(user), todayRegenerated, todayKeptProgress };
}
