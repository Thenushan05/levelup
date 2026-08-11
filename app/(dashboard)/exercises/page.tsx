import type { Metadata } from "next";
import { getExerciseLibrary } from "@/actions/progress";
import { ExerciseLibraryView } from "./exercise-library-view";

export const metadata: Metadata = { title: "Exercise Library — ASCEND" };

export default async function ExercisesPage() {
  const exercises = await getExerciseLibrary();
  return <ExerciseLibraryView exercises={exercises} />;
}
