import Link from "next/link";
import { Swords, Moon, Sparkle } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { EmptyState } from "@/components/system/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DailyWorkoutDTO } from "@/types";

export function DailyQuestCard({ quest }: { quest: DailyWorkoutDTO | null }) {
  if (!quest) {
    return (
      <EmptyState
        title="NO ACTIVE QUEST"
        description="Activate a routine to see your next scheduled quest here."
        icon={Swords}
        action={
          <Link href="/routine" className={cn(buttonVariants(), "heading-system tracking-widest")}>
            VIEW ROUTINES
          </Link>
        }
      />
    );
  }

  if (quest.type === "rest") {
    return (
      <SystemPanel variant="violet" className="flex flex-col items-center gap-3 py-10 text-center">
        <Moon className="h-8 w-8 text-glow-violet" />
        <SystemLabel accent>Recovery Day</SystemLabel>
        <p className="heading-system text-lg">SYSTEM RECOMMENDATION</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Rest and recover. Optional light mobility or walking.
        </p>
        <Link
          href="/quest"
          className={cn(buttonVariants({ variant: "outline" }), "heading-system tracking-widest")}
        >
          {quest.status === "complete" ? "RECOVERY LOGGED ✓" : "COMPLETE RECOVERY DAY"}
        </Link>
      </SystemPanel>
    );
  }

  if (quest.type === "optional") {
    return (
      <SystemPanel variant="violet" className="flex flex-col items-center gap-3 py-10 text-center">
        <Sparkle className="h-8 w-8 text-glow-violet" />
        <SystemLabel accent>Optional Quest</SystemLabel>
        <p className="heading-system text-lg">{quest.workoutName}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          No completion required. Badminton, walking, light cardio, mobility, or rest.
        </p>
      </SystemPanel>
    );
  }

  const ctaLabel =
    quest.status === "complete" ? "VIEW QUEST" : quest.status === "in_progress" ? "CONTINUE QUEST" : "START QUEST";

  return (
    <SystemPanel className="space-y-5">
      <div className="flex items-center justify-between">
        <SystemLabel accent>Daily Quest</SystemLabel>
        <SystemLabel>
          {quest.status === "complete" ? "COMPLETE" : `${quest.completedExercises} / ${quest.totalExercises}`}
        </SystemLabel>
      </div>
      <p className="heading-system text-2xl text-glow-cyan">{quest.workoutName}</p>
      <div>
        <HudProgress percentage={quest.progressPercentage} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {quest.completedExercises} / {quest.totalExercises} EXERCISES COMPLETED — {quest.progressPercentage}%
        </p>
      </div>
      <Link href="/quest" className={cn(buttonVariants(), "w-full heading-system tracking-widest")}>
        {ctaLabel}
      </Link>
    </SystemPanel>
  );
}
