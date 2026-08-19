import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemLabel } from "@/components/system/system-label";
import type { ExerciseEntryDTO } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  not_started: "NOT STARTED",
  in_progress: "IN PROGRESS",
  complete: "COMPLETE",
  locked: "LOCKED",
};

export function ExerciseObjectiveCard({
  index,
  exercise,
  basePath = "/quest",
}: {
  index: number;
  exercise: ExerciseEntryDTO;
  /** Lets the same card be reused for a different day's checklist — e.g. "/quest/yesterday"
   * for the missed-quest catch-up flow — instead of always linking into today's quest. */
  basePath?: string;
}) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const isComplete = exercise.status === "complete";
  const unit = exercise.repsUnit === "seconds" ? "SEC" : "REPS";
  const range =
    exercise.targetRepsMin === exercise.targetRepsMax
      ? `${exercise.targetRepsMin}`
      : `${exercise.targetRepsMin}–${exercise.targetRepsMax}`;
  const targetLabel = `${range} ${unit}${exercise.perSide ? " EACH SIDE" : ""}`;

  return (
    <Link
      href={`${basePath}/${exercise.id}`}
      className={cn(
        "system-panel flex items-center gap-4 p-4 transition-colors hover:bg-accent/40",
        isComplete && "system-panel-success"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          isComplete ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"
        )}
      >
        {isComplete ? <Check className="h-4 w-4" /> : index}
      </div>
      <div className="min-w-0 flex-1">
        <SystemLabel>Objective {String(index).padStart(2, "0")}</SystemLabel>
        <p className="heading-system truncate text-sm text-foreground">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">
          {exercise.targetSets} SETS · {targetLabel} · {completedSets}/{exercise.targetSets} DONE
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn("label-system", isComplete && "text-success")}>{STATUS_LABEL[exercise.status]}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
