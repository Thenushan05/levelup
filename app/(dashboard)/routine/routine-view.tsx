import { CalendarRange } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { dayLabel } from "@/lib/dates";
import type { ActiveRoutineDTO } from "@/actions/onboarding";

function orderByWeekStart(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function RoutineView({ routine }: { routine: ActiveRoutineDTO | null }) {
  if (!routine) {
    return (
      <EmptyState
        title="NO ACTIVE ROUTINE"
        description="Complete onboarding to activate a routine and see your weekly schedule here."
        icon={CalendarRange}
      />
    );
  }

  const sortedSchedule = [...routine.schedule].sort(
    (a, b) => orderByWeekStart(a.dayOfWeek) - orderByWeekStart(b.dayOfWeek)
  );

  return (
    <div className="space-y-6">
      <SystemPanel>
        <SystemLabel accent>Active Routine</SystemLabel>
        <SystemHeading className="mt-1">{routine.name}</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">{routine.description}</p>
      </SystemPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        {sortedSchedule.map((day) => (
          <SystemPanel
            key={day.dayOfWeek}
            variant={day.type === "workout" ? "cyan" : "violet"}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <SystemLabel accent>{dayLabel(day.dayOfWeek)}</SystemLabel>
              <span className="label-system">{day.type.toUpperCase()}</span>
            </div>
            <p className="heading-system text-base">{day.label}</p>
            {day.exercises.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {day.exercises.map((ex) => (
                  <li key={ex.name} className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="text-foreground">{ex.name}</span>
                    <span>
                      {ex.targetSets} ×{" "}
                      {ex.targetRepsMin === ex.targetRepsMax
                        ? ex.targetRepsMin
                        : `${ex.targetRepsMin}–${ex.targetRepsMax}`}
                      {ex.repsUnit === "seconds" ? " SEC" : ""}
                      {ex.perSide ? " / SIDE" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {day.type === "rest"
                  ? "Rest and recover. Optional light mobility or walking."
                  : "Optional light activity — badminton, walking, cardio, or mobility. No completion required."}
              </p>
            )}
          </SystemPanel>
        ))}
      </div>
    </div>
  );
}
