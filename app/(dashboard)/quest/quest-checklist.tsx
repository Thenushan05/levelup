"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlarmClockCheck, ChevronRight, Moon, Sparkle } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/system/empty-state";
import { ExerciseObjectiveCard } from "@/components/quest/exercise-objective-card";
import { ExtraWorkoutPanel } from "@/components/quest/extra-workout-panel";
import { completeRecoveryDay } from "@/actions/workout";
import type { ExtraWorkoutSummaryDTO } from "@/actions/extra-workout";
import { showErrorToast } from "@/lib/toast-system";
import type { DailyWorkoutDTO } from "@/types";

/** Shown atop every branch below when yesterday's scheduled workout was left unfinished — the
 * one-day catch-up window (see getMissedYesterdayQuest in actions/workout.ts). */
function MissedQuestBanner({ missed }: { missed: DailyWorkoutDTO }) {
  return (
    <Link
      href="/quest/yesterday"
      className="system-panel system-panel-danger flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
    >
      <AlarmClockCheck className="h-8 w-8 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <SystemLabel accent>Missed Yesterday</SystemLabel>
        <p className="heading-system truncate text-sm">{missed.workoutName}</p>
        <p className="text-xs text-muted-foreground">
          {missed.completedExercises}/{missed.totalExercises} objectives done — finish it today, before it's gone.
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function QuestChecklist({
  initial,
  extras,
  missedYesterday,
}: {
  initial: DailyWorkoutDTO | null;
  extras: ExtraWorkoutSummaryDTO;
  missedYesterday: DailyWorkoutDTO | null;
}) {
  const [quest, setQuest] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Overtime is loggable on every day type, including rest days and days with no scheduled quest.
  if (!quest) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        {missedYesterday && <MissedQuestBanner missed={missedYesterday} />}
        <EmptyState
          title="NO ACTIVE QUEST"
          description="Your next scheduled workout will appear here once you activate a routine."
          icon={Moon}
        />
        <ExtraWorkoutPanel initial={extras} />
      </div>
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
      <div className="mx-auto max-w-2xl space-y-5">
        {missedYesterday && <MissedQuestBanner missed={missedYesterday} />}
        <SystemPanel variant="violet" className="flex flex-col items-center gap-3 py-12 text-center">
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

        <ExtraWorkoutPanel initial={extras} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {missedYesterday && <MissedQuestBanner missed={missedYesterday} />}
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

      <ExtraWorkoutPanel initial={extras} />
    </div>
  );
}
