"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { ensureSeeded } from "@/lib/seed";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserDoc } from "@/lib/session";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";
import { toPlayerSummary } from "@/lib/dto";
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
  await user.save();

  revalidatePath("/dashboard");

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
  }[];
}

export interface ActiveRoutineDTO {
  name: string;
  description: string;
  schedule: RoutineDayDTO[];
}

export async function getActiveRoutineDetail(): Promise<ActiveRoutineDTO | null> {
  const user = await requireUserDoc();
  if (!user.activeTemplateId) return null;

  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return null;

  return {
    name: template.name,
    description: template.description,
    schedule: template.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      label: d.label,
      type: d.type as DayType,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        muscleGroup: e.muscleGroup,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        repsUnit: (e.repsUnit as "reps" | "seconds") ?? "reps",
        perSide: e.perSide ?? false,
      })),
    })),
  };
}
