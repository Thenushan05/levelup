"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { SetRow } from "@/components/quest/set-row";
import { ExerciseNotesField } from "@/components/quest/exercise-notes-field";
import { LevelUpModal } from "@/components/system/level-up-modal";
import { QuestCompleteModal, type QuestCompleteData } from "@/components/quest/quest-complete-modal";
import { updateSet, type ExerciseDetailDTO } from "@/actions/workout";
import { showAchievementToast, showErrorToast, showXpToast } from "@/lib/toast-system";
import { formatDisplayDate } from "@/lib/dates";
import type { LevelUpResult } from "@/types";

export function ExerciseDetailClient({
  dailyWorkoutId,
  initialDetail,
}: {
  dailyWorkoutId: string;
  initialDetail: ExerciseDetailDTO;
}) {
  const router = useRouter();
  const [exercise, setExercise] = useState(initialDetail.exercise);
  const [prevStatus, setPrevStatus] = useState(initialDetail.workout.status);
  const [levelUp, setLevelUp] = useState<LevelUpResult | null>(null);
  const [pendingComplete, setPendingComplete] = useState<QuestCompleteData | null>(null);
  const [completeData, setCompleteData] = useState<QuestCompleteData | null>(null);

  async function handleSaveSet(
    setNumber: number,
    weight: number | null,
    reps: number | null,
    completed: boolean
  ) {
    try {
      const result = await updateSet({
        dailyWorkoutId,
        exerciseEntryId: exercise.id,
        setNumber,
        weight,
        reps,
        completed,
      });
      const updatedExercise = result.workout.exercises.find((e) => e.id === exercise.id);
      if (updatedExercise) setExercise(updatedExercise);

      if (result.xpAwarded > 0 && completed) showXpToast(result.xpAwarded, "Objective Progress");
      result.achievementsUnlocked.forEach(showAchievementToast);

      const justCompleted = prevStatus !== "complete" && result.workout.status === "complete";
      setPrevStatus(result.workout.status);

      const data: QuestCompleteData | null = justCompleted
        ? {
            workout: result.workout,
            xp: result.xpAwarded,
            achievements: result.achievementsUnlocked,
            weeklyQuestCompleted: result.weeklyQuestCompleted,
          }
        : null;

      if (result.levelUp.leveledUp) {
        setLevelUp(result.levelUp);
        setPendingComplete(data);
      } else if (data) {
        setCompleteData(data);
      }
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Unable to save your set.");
    }
  }

  function handleLevelUpClose() {
    setLevelUp(null);
    if (pendingComplete) {
      setCompleteData(pendingComplete);
      setPendingComplete(null);
    }
  }

  const unit = exercise.repsUnit;
  const range =
    exercise.targetRepsMin === exercise.targetRepsMax
      ? `${exercise.targetRepsMin}`
      : `${exercise.targetRepsMin}–${exercise.targetRepsMax}`;
  const targetLabel = `${range} ${unit === "seconds" ? "SEC" : "REPS"}${exercise.perSide ? " EACH SIDE" : ""}`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/quest" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Quest
      </Link>

      <SystemPanel className="space-y-3 text-center">
        <SystemLabel accent>Objective</SystemLabel>
        <SystemHeading>{exercise.name}</SystemHeading>
        <p className="label-system">{exercise.muscleGroup}</p>
        <div className="mx-auto mt-2 flex max-w-xs items-center justify-around border-t border-border/60 pt-3 text-center">
          <div>
            <SystemLabel>Target Sets</SystemLabel>
            <p className="heading-system text-sm">{exercise.targetSets}</p>
          </div>
          <div>
            <SystemLabel>Target {unit === "seconds" ? "Time" : "Reps"}</SystemLabel>
            <p className="heading-system text-sm">{targetLabel}</p>
          </div>
        </div>
      </SystemPanel>

      {initialDetail.previousSets.length > 0 && (
        <SystemPanel variant="violet" className="space-y-2">
          <SystemLabel accent>
            Previous Record{initialDetail.previousDate ? ` — ${formatDisplayDate(initialDetail.previousDate)}` : ""}
          </SystemLabel>
          <div className="space-y-1.5">
            {initialDetail.previousSets.map((s) => (
              <div key={s.setNumber} className="flex justify-between text-sm text-muted-foreground">
                <span>SET {s.setNumber}</span>
                <span>
                  {s.weight ?? 0} KG × {s.reps ?? 0}
                </span>
              </div>
            ))}
          </div>
        </SystemPanel>
      )}

      <div className="space-y-2.5">
        <SystemLabel accent>Current Attempt</SystemLabel>
        {exercise.sets.map((s) => (
          <SetRow key={s.id} set={s} unit={unit} onSave={handleSaveSet} />
        ))}
      </div>

      <ExerciseNotesField
        dailyWorkoutId={dailyWorkoutId}
        exerciseEntryId={exercise.id}
        initialNotes={exercise.notes}
      />

      <p className="text-center text-xs text-muted-foreground">Continue when comfortable with good technique.</p>

      <LevelUpModal levelUp={levelUp} onClose={handleLevelUpClose} />
      <QuestCompleteModal
        data={completeData}
        onClose={() => {
          setCompleteData(null);
          router.push("/quest");
        }}
      />
    </div>
  );
}
