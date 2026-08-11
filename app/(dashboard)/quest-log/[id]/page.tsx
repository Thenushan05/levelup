import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWorkoutDetail } from "@/actions/history";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { formatDisplayDate, formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quest Detail — ASCEND" };

export default async function QuestLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkoutDetail(id);
  if (!workout) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/quest-log"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Quest Log
      </Link>

      <SystemPanel
        className="space-y-2 text-center"
        variant={workout.status === "complete" ? "success" : "cyan"}
      >
        <SystemLabel accent>{formatDisplayDate(workout.date)}</SystemLabel>
        <SystemHeading>{workout.workoutName}</SystemHeading>
        <p className="heading-system text-sm text-success">
          {workout.status === "complete"
            ? `QUEST COMPLETE ✓ — ${workout.completedExercises}/${workout.totalExercises} OBJECTIVES`
            : `${workout.completedExercises}/${workout.totalExercises} OBJECTIVES COMPLETE`}
        </p>
        {workout.type === "workout" && (
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 border-t border-border/60 pt-3 text-center">
            <div>
              <SystemLabel>Duration</SystemLabel>
              <p className="heading-system text-sm">{formatDuration(workout.durationMinutes)}</p>
            </div>
            <div>
              <SystemLabel>Sets</SystemLabel>
              <p className="heading-system text-sm">{workout.completedSets}</p>
            </div>
            <div>
              <SystemLabel>XP Earned</SystemLabel>
              <p className="heading-system text-sm text-glow-cyan">+{workout.xpEarned}</p>
            </div>
          </div>
        )}
      </SystemPanel>

      {workout.type === "workout" && (
        <div className="space-y-2.5">
          {workout.exercises.map((ex, i) => (
            <SystemPanel key={ex.id} noMotion className="space-y-1.5">
              <div className="flex items-center justify-between">
                <SystemLabel>Objective {String(i + 1).padStart(2, "0")}</SystemLabel>
                <span className="label-system">{ex.status.toUpperCase().replace("_", " ")}</span>
              </div>
              <p className="heading-system text-sm">{ex.name}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {ex.sets.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      "rounded border px-2 py-0.5",
                      s.completed ? "border-success/40 text-success" : "border-border"
                    )}
                  >
                    {s.completed ? `${s.weight ?? 0} KG × ${s.reps ?? 0}` : "—"}
                  </span>
                ))}
              </div>
            </SystemPanel>
          ))}
        </div>
      )}
    </div>
  );
}
