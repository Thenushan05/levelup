import type { Metadata } from "next";
import { getExerciseLibrary } from "@/actions/progress";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { TemplateForm } from "../template-form";

export const metadata: Metadata = { title: "New Template — Admin — ASCEND" };

export default async function NewTemplatePage() {
  const exercises = await getExerciseLibrary();
  const exerciseNames = Array.from(new Set(exercises.map((e) => e.name))).sort();
  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup))).sort();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <SystemLabel accent>Admin</SystemLabel>
        <SystemHeading className="mt-1">New Template</SystemHeading>
      </div>
      <TemplateForm exerciseSuggestions={exerciseNames} muscleGroupSuggestions={muscleGroups} />
    </div>
  );
}
