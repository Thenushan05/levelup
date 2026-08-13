"use server";

import { revalidatePath } from "next/cache";
import type { Types } from "mongoose";
import { requireAdminDoc } from "@/lib/session";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { Exercise } from "@/models/Exercise";
import { User } from "@/models/User";
import { templateFormSchema, type TemplateFormInput } from "@/lib/validations/admin";
import type { DayType } from "@/types";

export interface AdminTemplateSummaryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  daysPerWeek: number;
  isBuiltIn: boolean;
  usageCount: number;
}

export async function getAllTemplatesAdmin(): Promise<AdminTemplateSummaryDTO[]> {
  await requireAdminDoc();
  await connectToDatabase();

  const [templates, counts] = await Promise.all([
    WorkoutTemplate.find({}).sort({ createdAt: -1 }).lean(),
    User.aggregate([
      { $match: { activeTemplateId: { $ne: null } } },
      { $group: { _id: "$activeTemplateId", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((c: { _id: Types.ObjectId; count: number }) => [c._id.toString(), c.count]));

  return templates.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    slug: t.slug,
    description: t.description,
    daysPerWeek: t.daysPerWeek,
    isBuiltIn: t.isBuiltIn,
    usageCount: countMap.get(t._id.toString()) ?? 0,
  }));
}

export interface TemplateEditDayDTO {
  dayOfWeek: number;
  type: DayType;
  label: string;
  exercises: {
    name: string;
    muscleGroup: string;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    repsUnit: "reps" | "seconds";
    perSide: boolean;
    imageUrl: string | null;
  }[];
}

export interface TemplateEditDTO {
  id: string;
  name: string;
  description: string;
  schedule: TemplateEditDayDTO[];
}

export async function getTemplateForEdit(id: string): Promise<TemplateEditDTO | null> {
  await requireAdminDoc();
  await connectToDatabase();

  const t = await WorkoutTemplate.findById(id).lean();
  if (!t) return null;

  // Images live on the shared Exercise doc, not on the template's denormalized
  // exercise snapshot, so join them back in for the form to display.
  const exerciseIds = t.schedule.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
  const imageById = new Map(exercises.map((e) => [e._id.toString(), e.imageUrl ?? null]));

  return {
    id: t._id.toString(),
    name: t.name,
    description: t.description,
    schedule: t.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      type: d.type as DayType,
      label: d.label,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        muscleGroup: e.muscleGroup,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        repsUnit: (e.repsUnit as "reps" | "seconds") ?? "reps",
        perSide: e.perSide ?? false,
        imageUrl: imageById.get(e.exerciseId.toString()) ?? null,
      })),
    })),
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `template-${Date.now()}`
  );
}

/**
 * Reuses a catalog exercise by case-insensitive name match, or creates a new one — this is what makes the
 * exercise library grow as admins build templates. A provided imageUrl is written onto the Exercise doc
 * (create or update) so the image follows that exercise into every template that reuses it, not just the
 * one being saved.
 */
async function resolveExerciseId(name: string, muscleGroup: string, imageUrl?: string): Promise<Types.ObjectId> {
  const trimmedName = name.trim();
  const escaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleanImageUrl = imageUrl?.trim() || undefined;

  const existing = await Exercise.findOne({ name: new RegExp(`^${escaped}$`, "i") });
  if (existing) {
    if (cleanImageUrl && cleanImageUrl !== existing.imageUrl) {
      existing.imageUrl = cleanImageUrl;
      await existing.save();
    }
    return existing._id;
  }

  const created = await Exercise.create({
    slug: slugify(trimmedName),
    name: trimmedName,
    muscleGroup: muscleGroup.trim() || "General",
    imageUrl: cleanImageUrl ?? null,
    isBuiltIn: false,
  });
  return created._id;
}

async function buildScheduleDocs(days: TemplateFormInput["schedule"]) {
  return Promise.all(
    days.map(async (day) => ({
      dayOfWeek: day.dayOfWeek,
      label:
        day.label ||
        (day.type === "rest" ? "Recovery Day" : day.type === "optional" ? "Optional Activity" : "Training Day"),
      type: day.type,
      exercises:
        day.type === "workout"
          ? await Promise.all(
              day.exercises.map(async (ex) => ({
                exerciseId: await resolveExerciseId(ex.name, ex.muscleGroup, ex.imageUrl),
                name: ex.name.trim(),
                muscleGroup: ex.muscleGroup.trim() || "General",
                targetSets: ex.targetSets,
                targetRepsMin: ex.targetRepsMin,
                targetRepsMax: ex.targetRepsMax,
                repsUnit: ex.repsUnit,
                perSide: ex.perSide,
              }))
            )
          : [],
    }))
  );
}

export async function createTemplate(input: TemplateFormInput) {
  const parsed = templateFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await requireAdminDoc();
  await connectToDatabase();

  const schedule = await buildScheduleDocs(parsed.data.schedule);
  const daysPerWeek = schedule.filter((d) => d.type === "workout").length;

  const base = slugify(parsed.data.name);
  let slug = base;
  let suffix = 1;
  while (await WorkoutTemplate.findOne({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  const template = await WorkoutTemplate.create({
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    daysPerWeek,
    isBuiltIn: false,
    schedule,
  });

  revalidatePath("/admin/templates");
  revalidatePath("/onboarding");
  return { success: true as const, id: template._id.toString() };
}

export async function updateTemplate(id: string, input: TemplateFormInput) {
  const parsed = templateFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await requireAdminDoc();
  await connectToDatabase();

  const template = await WorkoutTemplate.findById(id);
  if (!template) {
    return { success: false as const, error: "Template not found." };
  }

  const schedule = await buildScheduleDocs(parsed.data.schedule);
  const daysPerWeek = schedule.filter((d) => d.type === "workout").length;

  template.name = parsed.data.name;
  template.description = parsed.data.description;
  template.daysPerWeek = daysPerWeek;
  template.schedule = schedule as unknown as typeof template.schedule;
  await template.save();

  revalidatePath("/admin/templates");
  revalidatePath("/onboarding");
  return { success: true as const, id: template._id.toString() };
}

export async function deleteTemplate(id: string): Promise<void> {
  await requireAdminDoc();
  await connectToDatabase();
  await WorkoutTemplate.findByIdAndDelete(id);
  revalidatePath("/admin/templates");
  revalidatePath("/onboarding");
}
