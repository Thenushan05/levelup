import Link from "next/link";
import { ScrollText } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { formatDisplayDate, formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { QuestLogEntryDTO } from "@/actions/history";

const STATUS_CLASS: Record<string, string> = {
  complete: "text-success",
  in_progress: "text-glow-cyan",
  not_started: "text-muted-foreground",
};

export function QuestLogView({ entries }: { entries: QuestLogEntryDTO[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="QUEST LOG EMPTY"
        description="Complete your first workout to begin your record."
        icon={ScrollText}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Quest Log</SystemLabel>
        <SystemHeading className="mt-1">Training History</SystemHeading>
      </div>
      <div className="space-y-3">
        {entries.map((e) => (
          <Link key={e.id} href={`/quest-log/${e.id}`}>
            <SystemPanel
              noMotion
              className="flex items-center justify-between gap-4 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <SystemLabel>{formatDisplayDate(e.date)}</SystemLabel>
                <p className="heading-system truncate text-base">{e.workoutName}</p>
                {e.type === "workout" ? (
                  <p className="text-xs text-muted-foreground">
                    {e.completedExercises} Objectives · {e.completedSets} Sets · {formatDuration(e.durationMinutes)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {e.type === "rest" ? "Recovery Day" : "Optional Activity"}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("heading-system text-sm", STATUS_CLASS[e.status] ?? "text-muted-foreground")}>
                  {e.status === "complete" ? "COMPLETE ✓" : e.status.toUpperCase().replace("_", " ")}
                </p>
                {e.xpEarned > 0 && <p className="text-xs text-glow-cyan">+{e.xpEarned} XP</p>}
              </div>
            </SystemPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
