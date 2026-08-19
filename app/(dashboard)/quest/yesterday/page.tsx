import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMissedYesterdayQuest } from "@/actions/workout";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { ExerciseObjectiveCard } from "@/components/quest/exercise-objective-card";

export const metadata: Metadata = { title: "Missed Quest — LevelUp" };

/**
 * The catch-up flow for a scheduled workout day the player never finished — only reachable via
 * the missed-quest banner on /quest, and only while it's still "yesterday" from today's point of
 * view (see getMissedYesterdayQuest). Bounces back to /quest once there's nothing left to catch
 * up on, whether that's because it's already done or because the one-day window closed.
 */
export default async function MissedQuestPage() {
  const quest = await getMissedYesterdayQuest();
  if (!quest) redirect("/quest");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SystemPanel className="space-y-3 text-center" variant="violet">
        <SystemLabel accent>Missed Quest — Catch Up</SystemLabel>
        <SystemHeading>{quest.workoutName}</SystemHeading>
        <HudProgress percentage={quest.progressPercentage} />
        <p className="text-xs text-muted-foreground">
          {quest.completedExercises} / {quest.totalExercises} OBJECTIVES COMPLETE — {quest.progressPercentage}%
          · LOGS AGAINST YESTERDAY, ONLY AVAILABLE TODAY
        </p>
      </SystemPanel>

      <div className="space-y-3">
        {quest.exercises.map((ex, i) => (
          <ExerciseObjectiveCard key={ex.id} index={i + 1} exercise={ex} basePath="/quest/yesterday" />
        ))}
      </div>
    </div>
  );
}
