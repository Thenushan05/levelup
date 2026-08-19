"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { SetRow } from "@/components/quest/set-row";
import { ExerciseNotesField } from "@/components/quest/exercise-notes-field";
import { QuestCompleteModal, type QuestCompleteData } from "@/components/quest/quest-complete-modal";
import { updateSet, type ExerciseDetailDTO } from "@/actions/workout";
import { showAchievementToast, showErrorToast, showSystemToast, showXpPendingToast } from "@/lib/toast-system";
import { enqueueAction, looksLikeNetworkFailure } from "@/lib/offline-queue";
import { formatDisplayDate } from "@/lib/dates";
import { usesWeightTracking } from "@/lib/weight-guidance";
import { assistLevelLabel } from "@/lib/dynamic-calorie-table";
import type { CatalogCalorieEstimate } from "@/lib/calories-burned";
import type { AssistLevel } from "@/types";

export function ExerciseDetailClient({
  dailyWorkoutId,
  initialDetail,
  backHref = "/quest",
}: {
  dailyWorkoutId: string;
  initialDetail: ExerciseDetailDTO;
  /** Where "Back to Quest" and the complete-modal's close both return to — "/quest/yesterday"
   * when this is showing a catch-up day instead of today's quest. */
  backHref?: string;
}) {
  const router = useRouter();
  const [exercise, setExercise] = useState(initialDetail.exercise);
  const [prevStatus, setPrevStatus] = useState(initialDetail.workout.status);
  const [completeData, setCompleteData] = useState<QuestCompleteData | null>(null);
  const [caloriesBurnedToday, setCaloriesBurnedToday] = useState<CatalogCalorieEstimate | null>(
    initialDetail.caloriesBurnedToday
  );

  function applyOptimisticSet(
    setNumber: number,
    weight: number | null,
    assistLevel: AssistLevel | null,
    reps: number | null,
    completed: boolean
  ) {
    setExercise((prev) => ({
      ...prev,
      sets: prev.sets.map((s) => (s.setNumber === setNumber ? { ...s, weight, assistLevel, reps, completed } : s)),
    }));
  }

  async function handleSaveSet(
    setNumber: number,
    weight: number | null,
    assistLevel: AssistLevel | null,
    reps: number | null,
    completed: boolean
  ) {
    const input = { dailyWorkoutId, exerciseEntryId: exercise.id, setNumber, weight, assistLevel, reps, completed };

    // Offline (or bad enough gym signal that the request can't complete): log
    // the set locally and queue it, rather than losing it or blocking on a
    // request that may never resolve. XP/achievements/completion feedback
    // only arrive once this actually syncs — see OfflineSyncManager.
    async function queueOffline(reason: string) {
      applyOptimisticSet(setNumber, weight, assistLevel, reps, completed);
      await enqueueAction({ kind: "updateSet", payload: input, label: exercise.name });
      showSystemToast("Set queued", reason);
    }

    if (!navigator.onLine) {
      await queueOffline("You're offline — this will sync automatically once you're back online.");
      return;
    }

    try {
      const result = await updateSet(input);
      const updatedExercise = result.workout.exercises.find((e) => e.id === exercise.id);
      if (updatedExercise) setExercise(updatedExercise);
      setCaloriesBurnedToday(result.caloriesBurnedToday);

      if (result.xpPending > 0 && completed) showXpPendingToast(result.xpPending, "Objective Progress");
      result.achievementsUnlocked.forEach(showAchievementToast);

      const justCompleted = prevStatus !== "complete" && result.workout.status === "complete";
      setPrevStatus(result.workout.status);

      if (justCompleted) {
        setCompleteData({
          workout: result.workout,
          xp: result.xpPending,
          achievements: result.achievementsUnlocked,
          weeklyQuestCompleted: result.weeklyQuestCompleted,
          caloriesBurnedToday: result.caloriesBurnedToday,
        });
      }
    } catch (err) {
      if (looksLikeNetworkFailure(err)) {
        await queueOffline("Connection issue — this will sync automatically once you're back online.");
        return;
      }
      showErrorToast(err instanceof Error ? err.message : "Unable to save your set.");
    }
  }

  const unit = exercise.repsUnit;
  const usesWeight = usesWeightTracking(exercise);
  const range =
    exercise.targetRepsMin === exercise.targetRepsMax
      ? `${exercise.targetRepsMin}`
      : `${exercise.targetRepsMin}–${exercise.targetRepsMax}`;
  const targetLabel = `${range} ${unit === "seconds" ? "SEC" : "REPS"}${exercise.perSide ? " EACH SIDE" : ""}`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Quest
      </Link>

      <SystemPanel className="space-y-3 text-center">
        <SystemLabel accent>Objective</SystemLabel>
        <SystemHeading>{exercise.name}</SystemHeading>
        <p className="label-system">{exercise.muscleGroup}</p>
        <div className="mx-auto mt-2 flex max-w-sm items-center justify-around border-t border-border/60 pt-3 text-center">
          <div>
            <SystemLabel>Target Sets</SystemLabel>
            <p className="heading-system text-sm">{exercise.targetSets}</p>
          </div>
          <div>
            <SystemLabel>Target {unit === "seconds" ? "Time" : "Reps"}</SystemLabel>
            <p className="heading-system text-sm">{targetLabel}</p>
          </div>
          {caloriesBurnedToday && (
            <div>
              <SystemLabel>Burned Today</SystemLabel>
              <p className="heading-system flex items-center justify-center gap-1 text-sm text-glow-cyan">
                <Flame className="h-3.5 w-3.5" /> {caloriesBurnedToday.kcal} KCAL
              </p>
            </div>
          )}
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
                  {usesWeight && s.weight ? `${s.weight} KG × ` : ""}
                  {s.assistLevel ? `${assistLevelLabel(s.assistLevel)} × ` : ""}
                  {s.reps ?? 0} {unit === "seconds" ? "SEC" : "REPS"}
                </span>
              </div>
            ))}
          </div>
        </SystemPanel>
      )}

      <div className="space-y-2.5">
        <SystemLabel accent>Current Attempt</SystemLabel>
        {exercise.sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            unit={unit}
            showWeight={usesWeight}
            onSave={handleSaveSet}
            exerciseSlug={initialDetail.exerciseSlug}
            bodyWeightKg={initialDetail.bodyWeightKg}
          />
        ))}
      </div>

      <ExerciseNotesField
        dailyWorkoutId={dailyWorkoutId}
        exerciseEntryId={exercise.id}
        initialNotes={exercise.notes}
      />

      <p className="text-center text-xs text-muted-foreground">Continue when comfortable with good technique.</p>

      <QuestCompleteModal
        data={completeData}
        onClose={() => {
          setCompleteData(null);
          router.push(backHref);
        }}
      />
    </div>
  );
}
