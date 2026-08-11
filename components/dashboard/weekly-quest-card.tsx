import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { cn } from "@/lib/utils";
import { dayLabel } from "@/lib/dates";
import type { WeeklyQuestStatusDTO } from "@/actions/progress";

const STATUS_STYLE: Record<string, string> = {
  complete: "text-glow-cyan",
  pending: "text-foreground",
  missed: "text-destructive",
  future: "text-muted-foreground/40",
  na: "text-muted-foreground/50",
};

const STATUS_ICON: Record<string, string> = {
  complete: "✓",
  pending: "○",
  missed: "✕",
  future: "·",
  na: "–",
};

export function WeeklyQuestCard({ weekly }: { weekly: WeeklyQuestStatusDTO | null }) {
  if (!weekly) return null;

  const pct = weekly.requiredCount > 0 ? (weekly.completedCount / weekly.requiredCount) * 100 : 0;

  return (
    <SystemPanel className="space-y-4">
      <SystemLabel accent>Weekly Quest</SystemLabel>
      <p className="heading-system text-sm">COMPLETE {weekly.requiredCount} TRAINING DAYS</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekly.days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{dayLabel(d.dayOfWeek)}</span>
            <span className={cn("text-sm font-medium", STATUS_STYLE[d.status])}>
              {d.type !== "workout" ? (d.type === "rest" ? "R" : "O") : STATUS_ICON[d.status]}
            </span>
          </div>
        ))}
      </div>
      <HudProgress percentage={pct} />
      <p className="text-center text-xs text-muted-foreground">
        {weekly.completedCount} / {weekly.requiredCount} REQUIRED QUESTS COMPLETE
        {weekly.claimed && " · +100 XP CLAIMED"}
      </p>
    </SystemPanel>
  );
}
