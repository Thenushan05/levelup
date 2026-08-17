import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Info, CheckCircle2, Clock, Circle, Target, Dumbbell, Trophy } from "lucide-react";
import { getCalorieTrackingData, type CalorieExerciseRowDTO } from "@/actions/calories";
import { assistLevelLabel } from "@/lib/dynamic-calorie-table";
import type { CatalogCalorieEstimate } from "@/lib/calories-burned";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calorie Tracking — LevelUp" };

const SOURCE_LABEL: Record<CalorieExerciseRowDTO["source"], string> = {
  dynamic: "WEIGHT TABLE",
  catalog: "CATALOG EST.",
  unavailable: "NO DATA",
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, (n / total) * 100)) : 0;
}

export default async function CaloriesPage() {
  const data = await getCalorieTrackingData();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-glow-cyan" />
          <SystemLabel accent>Calorie Tracking</SystemLabel>
        </div>
        <SystemHeading className="mt-1">Burn Readout</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Exercises with a weight-vs-bodyweight table (currently Monday&apos;s Push Focus and Tuesday&apos;s
          Pull Focus days) get a precise range once you log a set. Every figure here counts as{" "}
          <strong>Logged</strong> only
          once an admin approves it — until then it sits as <strong>Pending</strong>.
        </p>
      </div>

      {!data.hasBodyWeight && (
        <SystemPanel variant="violet" className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-glow-violet" />
          <p className="text-sm text-muted-foreground">
            Add your bodyweight in{" "}
            <Link href="/diet" className="text-glow-cyan underline">
              Diet &amp; Body
            </Link>{" "}
            to unlock the precise weight-scaled burn for supported exercises.
          </p>
        </SystemPanel>
      )}

      <SystemPanel className="space-y-4">
        <div className="flex items-center justify-between">
          <SystemLabel accent>Today</SystemLabel>
          <span className="text-[11px] text-muted-foreground">{data.today?.workoutName}</span>
        </div>

        {!data.today ? (
          <p className="text-sm text-muted-foreground">No active routine today.</p>
        ) : data.today.type !== "workout" ? (
          <p className="text-sm text-muted-foreground">
            {data.today.type === "rest" ? "Rest day — no calories tracked." : "Optional day — no calories tracked."}
          </p>
        ) : (
          <>
            <CalorieMeter logged={data.today.logged} pending={data.today.pending} target={data.today.target} />

            <div className="space-y-2 pt-1">
              {data.today.exercises.map((ex) => (
                <ExerciseRow key={ex.name} exercise={ex} />
              ))}
            </div>
          </>
        )}
      </SystemPanel>

      <SystemPanel className="space-y-3">
        <SystemLabel accent>Recent Workouts</SystemLabel>
        {data.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete a workout to see its burn total here.</p>
        ) : (
          <div className="space-y-2">
            {data.history.map((row) => (
              <div key={row.date} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm">{row.workoutName}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDisplayDate(row.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 heading-system text-sm text-glow-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {row.logged?.kcal ?? 0}
                  </span>
                  {row.pending && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Clock className="h-3.5 w-3.5" /> +{row.pending.kcal}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemPanel>

      <SystemPanel variant="success" noMotion className="flex items-center justify-center gap-2.5">
        <Trophy className="h-6 w-6 shrink-0 text-glow-cyan" />
        <div className="text-left">
          <p className="heading-system text-xl text-glow-cyan">{data.totalLogged.totalKcal.toLocaleString()} KCAL</p>
          <p className="text-[11px] text-muted-foreground">All-Time Logged · {data.totalLogged.totalWorkouts} workouts approved</p>
        </div>
      </SystemPanel>
    </div>
  );
}

function CalorieMeter({
  logged,
  pending,
  target,
}: {
  logged: CatalogCalorieEstimate | null;
  pending: CatalogCalorieEstimate | null;
  target: CatalogCalorieEstimate | null;
}) {
  const loggedKcal = logged?.kcal ?? 0;
  const pendingKcal = pending?.kcal ?? 0;
  const targetKcal = target?.kcal ?? 0;

  const loggedPct = pct(loggedKcal, targetKcal);
  const combinedPct = pct(loggedKcal + pendingKcal, targetKcal);
  const pendingPct = Math.max(0, combinedPct - loggedPct);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl text-glow-success">{loggedKcal}</span>
          <span className="text-xs text-muted-foreground">KCAL LOGGED</span>
        </div>
        {targetKcal > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> GOAL {targetKcal} KCAL
          </span>
        )}
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success transition-all" style={{ width: `${loggedPct}%` }} />
        <div className="h-full bg-amber-400/70 transition-all" style={{ width: `${pendingPct}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-success" /> Logged (approved)
        </span>
        {pendingKcal > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400/70" /> Pending approval — {pendingKcal} kcal
          </span>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: CalorieExerciseRowDTO }) {
  const StatusIcon = exercise.status !== "complete" ? Circle : exercise.approved ? CheckCircle2 : Clock;
  const statusTone =
    exercise.status !== "complete"
      ? "text-muted-foreground"
      : exercise.approved
        ? "text-glow-success"
        : "text-amber-400";
  const statusLabel = exercise.status !== "complete" ? "Not done yet" : exercise.approved ? "Logged" : "Pending approval";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <StatusIcon className={cn("mt-0.5 h-4 w-4 shrink-0", statusTone)} />
        <div className="min-w-0">
          <p className="text-sm font-medium">{exercise.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Dumbbell className="h-3 w-3 shrink-0" />
            {(() => {
              // Bodyweight-only exercises (Hanging Knee Raise) never log a weight at all —
              // showing "Not logged yet" next to a redundant "· Bodyweight" tier reads oddly,
              // so just say Bodyweight once and skip the tier suffix below for this case.
              const isBodyWeightOnly =
                exercise.assistLevel == null && exercise.loggedWeightKg == null && exercise.weightTierLabel === "Bodyweight";
              if (isBodyWeightOnly) return "Bodyweight";
              if (exercise.assistLevel) return assistLevelLabel(exercise.assistLevel);
              if (exercise.loggedWeightKg != null) return `${Math.round(exercise.loggedWeightKg * 10) / 10} kg`;
              return "Not logged yet";
            })()}
            {exercise.weightTierLabel &&
              exercise.weightTierLabel !== "Bodyweight" &&
              ` · ${exercise.weightTierLabel}`}
            {exercise.bodyWeightBandLabel && ` · ${exercise.bodyWeightBandLabel} bodyweight`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide", statusTone, "border-current/30")}>
          {statusLabel.toUpperCase()}
        </span>
        <div className="text-right">
          <p className="heading-system text-sm text-glow-cyan">
            {exercise.minKcal != null && exercise.maxKcal != null ? `${exercise.minKcal}–${exercise.maxKcal}` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{SOURCE_LABEL[exercise.source]}</p>
        </div>
      </div>
    </div>
  );
}
