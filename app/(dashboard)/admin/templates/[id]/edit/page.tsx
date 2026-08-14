import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTemplateForEdit } from "@/actions/admin";
import { getExerciseLibrary } from "@/actions/progress";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { TemplateForm } from "../../template-form";

export const metadata: Metadata = { title: "Edit Template — Admin — LevelUp" };

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, exercises] = await Promise.all([getTemplateForEdit(id), getExerciseLibrary()]);
  if (!template) notFound();

  const exerciseNames = Array.from(new Set(exercises.map((e) => e.name))).sort();
  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup))).sort();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <SystemLabel accent>Admin</SystemLabel>
        <SystemHeading className="mt-1">Edit Template</SystemHeading>
      </div>
      <TemplateForm existing={template} exerciseSuggestions={exerciseNames} muscleGroupSuggestions={muscleGroups} />
    </div>
  );
}
