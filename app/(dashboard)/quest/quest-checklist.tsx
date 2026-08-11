"use client";

import { useState, useTransition } from "react";
import { Moon, Sparkle } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/system/empty-state";
import { ExerciseObjectiveCard } from "@/components/quest/exercise-objective-card";
import { completeRecoveryDay } from "@/actions/workout";
import { showErrorToast } from "@/lib/toast-system";
import type { DailyWorkoutDTO } from "@/types";

export function QuestChecklist({ initial }: { initial: DailyWorkoutDTO | null }) {
  const [quest, setQuest] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (!quest) {
    return (
      <EmptyState
        title="NO ACTIVE QUEST"
        description="Your next scheduled workout will appear here once you activate a routine."
        icon={Moon}
      />
    );
  }

  if (quest.type !== "workout") {
    const isRest = quest.type === "rest";

    function handleAcknowledge() {
      startTransition(async () => {
        try {
          const updated = await completeRecoveryDay(quest!.id);
          setQuest(updated);
        } catch (err) {
          showErrorToast(err instanceof Error ? err.message : "Unable to save.");
        }
      });
    }

    return (
      <SystemPanel variant="violet" className="mx-auto flex max-w-lg flex-col items-center gap-3 py-12 text-center">
        {isRest ? (
          <Moon className="h-10 w-10 text-glow-violet" />
        ) : (
          <Sparkle className="h-10 w-10 text-glow-violet" />
        )}
        <SystemLabel accent>{isRest ? "Recovery Day" : "Optional Quest"}</SystemLabel>
        <SystemHeading>{quest.workoutName}</SystemHeading>
        {isRest ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              Rest and recover. Optional light mobility or walking.
            </p>
            <Button
              onClick={handleAcknowledge}
              disabled={pending || quest.status === "complete"}
              className="heading-system tracking-widest"
            >
              {quest.status === "complete" ? "RECOVERY LOGGED ✓" : pending ? "SAVING..." : "COMPLETE RECOVERY DAY"}
            </Button>
          </>
        ) : (
          <p className="max-w-sm text-sm text-muted-foreground">
            No completion required. Badminton, walking, light cardio, mobility, or rest.
          </p>
        )}
      </SystemPanel>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SystemPanel className="space-y-3 text-center">
        <SystemLabel accent>Daily Quest</SystemLabel>
        <SystemHeading>{quest.workoutName}</SystemHeading>
        <HudProgress percentage={quest.progressPercentage} />
        <p className="text-xs text-muted-foreground">
          {quest.completedExercises} / {quest.totalExercises} OBJECTIVES COMPLETE — {quest.progressPercentage}%
        </p>
      </SystemPanel>

      <div className="space-y-3">
        {quest.exercises.map((ex, i) => (
          <ExerciseObjectiveCard key={ex.id} index={i + 1} exercise={ex} />
        ))}
      </div>
    </div>
  );
}
