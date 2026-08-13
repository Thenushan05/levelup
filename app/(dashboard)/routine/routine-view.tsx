import { CalendarRange } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { ExerciseImageButton } from "@/components/system/exercise-image-button";
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
              <ul className="space-y-2 text-sm">
                {day.exercises.map((ex) => (
                  <li
                    key={ex.name}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground">{ex.name}</span>
                        {ex.imageUrl && <ExerciseImageButton imageUrl={ex.imageUrl} name={ex.name} />}
                      </div>
                      {ex.suggestedWeight && (
                        <p className="mt-0.5 text-xs font-medium text-glow-cyan">{ex.suggestedWeight}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-foreground">
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
