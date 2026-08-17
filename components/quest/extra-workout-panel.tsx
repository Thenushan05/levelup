"use client";

import { useState, useTransition } from "react";
import { Dumbbell, Flame, Plus, Timer, Trash2, X } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logExtraWorkout, deleteExtraWorkout } from "@/actions/extra-workout";
import type { ExtraWorkoutSummaryDTO } from "@/actions/extra-workout";
import { showErrorToast, showSystemToast, showXpPendingToast } from "@/lib/toast-system";
import { guidanceWeightFor } from "@/lib/extra-workout-xp";
import type { CardioIntensity, ExtraWorkoutCategory, ExtraWorkoutDTO } from "@/types";

const CATEGORIES: { value: ExtraWorkoutCategory; label: string; icon: typeof Dumbbell }[] = [
  { value: "weight_training", label: "WEIGHTS", icon: Dumbbell },
  { value: "cardio", label: "CARDIO", icon: Flame },
  { value: "abs", label: "ABS", icon: Timer },
];

const INTENSITIES: CardioIntensity[] = ["light", "moderate", "intense"];

function summaryLine(e: ExtraWorkoutDTO): string {
  if (e.category === "cardio") {
    return `${e.durationMin} MIN · ${(e.intensity ?? "moderate").toUpperCase()}`;
  }
  const volume = e.durationSec ? `${e.sets} × ${e.durationSec} SEC` : `${e.sets} × ${e.reps}`;
  return e.weightKg ? `${volume} @ ${e.weightKg} KG` : volume;
}

export function ExtraWorkoutPanel({ initial }: { initial: ExtraWorkoutSummaryDTO }) {
  const [summary, setSummary] = useState(initial);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExtraWorkoutCategory>("weight_training");
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("12");
  const [weight, setWeight] = useState("");
  const [durationMin, setDurationMin] = useState("20");
  const [durationSec, setDurationSec] = useState("");
  const [intensity, setIntensity] = useState<CardioIntensity>("moderate");
  const [pending, startTransition] = useTransition();

  const stats = { weightKg: summary.bodyWeightKg, heightCm: summary.heightCm };
  const guidance = category === "weight_training" && name.trim().length > 1 ? guidanceWeightFor(name, stats) : null;

  function resetForm() {
    setName("");
    setSets("3");
    setReps("12");
    setWeight("");
    setDurationMin("20");
    setDurationSec("");
    setIntensity("moderate");
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showErrorToast("Give the workout a name first.");
      return;
    }

    startTransition(async () => {
      const input =
        category === "cardio"
          ? { category: "cardio" as const, name: trimmed, notes: "", durationMin: Number(durationMin) || 0, intensity }
          : category === "abs"
            ? {
                category: "abs" as const,
                name: trimmed,
                notes: "",
                sets: Number(sets) || 0,
                reps: durationSec ? null : Number(reps) || 0,
                durationSec: durationSec ? Number(durationSec) : null,
                weightKg: weight ? Number(weight) : null,
              }
            : {
                category: "weight_training" as const,
                name: trimmed,
                notes: "",
                sets: Number(sets) || 0,
                reps: Number(reps) || 0,
                weightKg: weight ? Number(weight) : null,
              };

      const result = await logExtraWorkout(input);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      const { entry, xpRemainingToday, cappedByDailyLimit } = result.data;
      setSummary((prev) => ({
        ...prev,
        entries: [entry, ...prev.entries],
        xpUsedToday: prev.xpUsedToday + entry.xpAwarded,
        xpRemainingToday,
      }));

      if (entry.xpAwarded > 0) {
        showXpPendingToast(entry.xpAwarded, entry.name);
        if (cappedByDailyLimit) showSystemToast("Daily bonus cap reached", "Further extras log without XP.");
      } else {
        showSystemToast("Logged without XP", "You've hit today's bonus cap. Still counts in your history.");
      }

      resetForm();
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteExtraWorkout(id);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      setSummary((prev) => {
        const removed = prev.entries.find((e) => e.id === id);
        const used = prev.xpUsedToday - (removed?.xpAwarded ?? 0);
        return {
          ...prev,
          entries: prev.entries.filter((e) => e.id !== id),
          xpUsedToday: used,
          xpRemainingToday: Math.max(0, prev.dailyCap - used),
        };
      });
    });
  }

  const showWeightField = category !== "cardio";

  return (
    <SystemPanel variant="violet" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <SystemLabel accent>Overtime</SystemLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Extra work beyond your routine — scaled to your bodyweight and height.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="heading-system text-sm text-glow-violet">
            {summary.xpRemainingToday} / {summary.dailyCap}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">XP Left Today</p>
        </div>
      </div>

      {summary.bodyWeightKg == null && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Add your body stats in Diet to unlock weight-scaled XP. Until then extras earn a flat 5 XP.
        </p>
      )}

      {summary.entries.length > 0 && (
        <ul className="space-y-2">
          {summary.entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{summaryLine(e)}</p>
              </div>
              <span className="heading-system shrink-0 text-xs text-glow-violet">
                {e.xpAwarded > 0 ? `+${e.xpAwarded} XP` : "CAPPED"}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                disabled={pending}
                aria-label={`Delete ${e.name}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="heading-system w-full tracking-widest"
        >
          <Plus className="mr-1 h-4 w-4" /> LOG EXTRA WORKOUT
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <SystemLabel>Category</SystemLabel>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cancel"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] tracking-widest transition-colors ${
                  category === value
                    ? "border-primary bg-primary/10 text-glow-violet"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              category === "cardio" ? "e.g. Treadmill" : category === "abs" ? "e.g. Russian Twist" : "e.g. Hip Abductor"
            }
            maxLength={60}
          />

          {guidance != null && (
            <p className="text-[11px] text-muted-foreground">
              Normal for you: <span className="text-glow-violet">~{guidance} kg</span>. Beat it to earn more XP.
            </p>
          )}

          {category === "cardio" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="h-9 w-20 text-center"
                />
                <span className="text-xs text-muted-foreground">MINUTES</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {INTENSITIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIntensity(level)}
                    className={`rounded-lg border px-2 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                      intensity === level
                        ? "border-primary bg-primary/10 text-glow-violet"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="h-9 w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">SETS</span>
              </div>

              {category === "abs" && durationSec ? null : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="h-9 w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">REPS</span>
                </div>
              )}

              {category === "abs" && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    className="h-9 w-16 text-center"
                    placeholder="—"
                  />
                  <span className="text-xs text-muted-foreground">SEC</span>
                </div>
              )}

              {showWeightField && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-9 w-20 text-center"
                    placeholder={category === "abs" ? "—" : "0"}
                  />
                  <span className="text-xs text-muted-foreground">KG</span>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={pending} className="heading-system w-full tracking-widest">
            {pending ? "LOGGING..." : "LOG IT"}
          </Button>
        </div>
      )}
    </SystemPanel>
  );
}
