import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExerciseProgress } from "@/actions/progress";
import { ExerciseProgressView } from "./exercise-progress-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug.replace(/-/g, " ")} — ASCEND` };
}

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const progress = await getExerciseProgress(slug);
  if (!progress) notFound();

  return <ExerciseProgressView progress={progress} />;
}
