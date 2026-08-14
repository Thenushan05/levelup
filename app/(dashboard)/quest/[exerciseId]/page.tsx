import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTodayQuest, getExerciseDetail } from "@/actions/workout";
import { ExerciseDetailClient } from "./exercise-detail-client";

export const metadata: Metadata = { title: "Objective — LevelUp" };

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const quest = await getTodayQuest();
  if (!quest || quest.type !== "workout") notFound();

  const detail = await getExerciseDetail(quest.id, exerciseId);
  if (!detail) notFound();

  return <ExerciseDetailClient dailyWorkoutId={quest.id} initialDetail={detail} />;
}
