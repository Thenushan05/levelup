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

  const workoutDaysCount = sortedSchedule.filter((d) => d.type === "workout").length;
  const restDaysCount = sortedSchedule.filter((d) => d.type === "rest").length;

  return (
    <div className="space-y-6 min-w-0">
      <SystemPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SystemLabel accent>Active Routine</SystemLabel>
            <SystemHeading className="mt-1">{routine.name}</SystemHeading>
            <p className="mt-1 text-sm text-muted-foreground">{routine.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-glow-cyan">
              {workoutDaysCount} Workout Days
            </span>
            {restDaysCount > 0 && (
              <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {restDaysCount} Rest
              </span>
            )}
          </div>
        </div>
      </SystemPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        {sortedSchedule.map((day) => (
          <SystemPanel
            key={day.dayOfWeek}
            variant={day.type === "workout" ? "cyan" : "violet"}
            className="space-y-3 min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <SystemLabel accent>{dayLabel(day.dayOfWeek)}</SystemLabel>
              <span className="label-system shrink-0">{day.type.toUpperCase()}</span>
            </div>
            <p className="heading-system text-base leading-tight break-words">{day.label}</p>
            {day.exercises.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {day.exercises.map((ex) => (
                  <li
                    key={ex.name}
                    className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/40 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="font-semibold text-foreground text-sm break-words sm:truncate">
                          {ex.name}
                        </span>
                        {ex.imageUrl && <ExerciseImageButton imageUrl={ex.imageUrl} name={ex.name} />}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      {ex.suggestedWeight && (
                        <span className="text-xs font-medium text-glow-cyan">{ex.suggestedWeight}</span>
                      )}
                      <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-foreground">
                        {ex.targetSets} ×{" "}
                        {ex.targetRepsMin === ex.targetRepsMax
                          ? ex.targetRepsMin
                          : `${ex.targetRepsMin}–${ex.targetRepsMax}`}
                        {ex.repsUnit === "seconds" ? " SEC" : ""}
                        {ex.perSide ? " / SIDE" : ""}
                      </span>
                    </div>
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
