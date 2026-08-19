import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMissedYesterdayQuest, getExerciseDetail } from "@/actions/workout";
import { ExerciseDetailClient } from "../../[exerciseId]/exercise-detail-client";

export const metadata: Metadata = { title: "Missed Objective — LevelUp" };

export default async function MissedExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const quest = await getMissedYesterdayQuest();
  if (!quest) notFound();

  const detail = await getExerciseDetail(quest.id, exerciseId);
  if (!detail) notFound();

  return <ExerciseDetailClient dailyWorkoutId={quest.id} initialDetail={detail} backHref="/quest/yesterday" />;
}
