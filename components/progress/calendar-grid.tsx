import { cn } from "@/lib/utils";
import { parseDateKey } from "@/lib/dates";
import type { CalendarDayDTO } from "@/actions/history";

const STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  in_progress: "In Progress",
  pending: "Pending",
  missed: "Missed",
  recovery: "Recovery",
  optional: "Optional",
  future: "Upcoming",
  no_plan: "No Plan",
};

const STATUS_CLASS: Record<string, string> = {
  complete: "border-success/50 bg-success/10 text-success",
  in_progress: "border-primary/50 bg-primary/10 text-glow-cyan",
  pending: "border-primary/30 text-muted-foreground",
  missed: "border-destructive/40 bg-destructive/10 text-destructive",
  recovery: "border-secondary/40 bg-secondary/10 text-glow-violet",
  optional: "border-secondary/25 text-muted-foreground",
  future: "border-border/30 text-muted-foreground/40",
  no_plan: "border-border/20 text-muted-foreground/30",
};

const LEGEND: { status: string; label: string; dot: string }[] = [
  { status: "complete", label: "Complete", dot: "bg-success" },
  { status: "in_progress", label: "In Progress", dot: "bg-primary" },
  { status: "missed", label: "Missed", dot: "bg-destructive" },
  { status: "recovery", label: "Recovery", dot: "bg-secondary" },
  { status: "optional", label: "Optional", dot: "bg-secondary/50" },
];

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarGrid({ days }: { days: CalendarDayDTO[] }) {
  if (days.length === 0) return null;
  const firstDow = parseDateKey(days[0].date).getDay();
  const leadingBlanks = Array.from({ length: firstDow });

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
        {WEEKDAY_HEADERS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {leadingBlanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date} — ${STATUS_LABEL[day.status]}${day.workoutName ? `: ${day.workoutName}` : ""}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border text-xs font-medium",
              STATUS_CLASS[day.status]
            )}
          >
            {parseDateKey(day.date).getDate()}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {LEGEND.map((l) => (
          <span key={l.status} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", l.dot)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
