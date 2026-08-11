"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createTemplate, updateTemplate, type TemplateEditDTO } from "@/actions/admin";
import { dayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayType } from "@/types";

interface ExerciseFormState {
  key: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  repsUnit: "reps" | "seconds";
  perSide: boolean;
}

interface DayFormState {
  dayOfWeek: number;
  type: DayType;
  label: string;
  exercises: ExerciseFormState[];
}

// Monday-first display order, matching the Routine page.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_TYPES: DayType[] = ["workout", "rest", "optional"];

function randomKey(): string {
  return Math.random().toString(36).slice(2);
}

function emptyExercise(): ExerciseFormState {
  return {
    key: randomKey(),
    name: "",
    muscleGroup: "",
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    repsUnit: "reps",
    perSide: false,
  };
}

function defaultDays(): DayFormState[] {
  return WEEK_ORDER.map((dow) => ({ dayOfWeek: dow, type: "rest" as DayType, label: "", exercises: [] }));
}

export function TemplateForm({
  existing,
  exerciseSuggestions,
  muscleGroupSuggestions,
}: {
  existing?: TemplateEditDTO;
  exerciseSuggestions: string[];
  muscleGroupSuggestions: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [days, setDays] = useState<DayFormState[]>(() => {
    if (!existing) return defaultDays();
    const byDow = new Map(existing.schedule.map((d) => [d.dayOfWeek, d]));
    return WEEK_ORDER.map((dow) => {
      const d = byDow.get(dow);
      return {
        dayOfWeek: dow,
        type: d?.type ?? "rest",
        label: d?.label ?? "",
        exercises: (d?.exercises ?? []).map((e) => ({ ...e, key: randomKey() })),
      };
    });
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDay(dayOfWeek: number, patch: Partial<DayFormState>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  function addExercise(dayOfWeek: number) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d))
    );
  }

  function updateExercise(dayOfWeek: number, key: string, patch: Partial<ExerciseFormState>) {
    setDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, exercises: d.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) }
          : d
      )
    );
  }

  function removeExercise(dayOfWeek: number, key: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, exercises: d.exercises.filter((e) => e.key !== key) } : d
      )
    );
  }

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    for (const day of days) {
      if (day.type === "workout" && day.exercises.length === 0) {
        setError(`${dayLabel(day.dayOfWeek)} is marked as a training day but has no exercises.`);
        return;
      }
      if (day.type === "workout" && day.exercises.some((e) => !e.name.trim() || !e.muscleGroup.trim())) {
        setError(`${dayLabel(day.dayOfWeek)} has an exercise missing a name or muscle group.`);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      schedule: days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        type: d.type,
        label: d.label.trim(),
        exercises: d.exercises.map((e) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          repsUnit: e.repsUnit,
          perSide: e.perSide,
        })),
      })),
    };

    startTransition(async () => {
      const result = existing ? await updateTemplate(existing.id, payload) : await createTemplate(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/templates");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SystemPanel className="space-y-4">
        <SystemLabel accent>Template Info</SystemLabel>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name" className="label-system">
            Name
          </Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Iron Path" maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-desc" className="label-system">
            Description
          </Label>
          <Textarea
            id="tpl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown during onboarding"
            maxLength={300}
          />
        </div>
      </SystemPanel>

      <datalist id="exercise-names">
        {exerciseSuggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="muscle-groups">
        {muscleGroupSuggestions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="space-y-4">
        {days.map((day) => (
          <SystemPanel key={day.dayOfWeek} noMotion className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SystemLabel accent>{dayLabel(day.dayOfWeek)}</SystemLabel>
              <div className="flex gap-1.5">
                {DAY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateDay(day.dayOfWeek, { type: t })}
                    className={cn(
                      "heading-system rounded-md border px-2.5 py-1 text-xs tracking-wide",
                      day.type === t
                        ? "border-primary bg-primary/10 text-glow-cyan"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {day.type !== "rest" && (
              <Input
                value={day.label}
                onChange={(e) => updateDay(day.dayOfWeek, { label: e.target.value })}
                placeholder={day.type === "workout" ? "e.g. Upper Body A" : "e.g. Optional Activity"}
                maxLength={60}
              />
            )}

            {day.type === "workout" && (
              <div className="space-y-2.5">
                {day.exercises.map((ex) => (
                  <div
                    key={ex.key}
                    className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border p-2.5 sm:grid-cols-12"
                  >
                    <input
                      list="exercise-names"
                      value={ex.name}
                      onChange={(e) => updateExercise(day.dayOfWeek, ex.key, { name: e.target.value })}
                      placeholder="Exercise name"
                      className="col-span-2 h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-primary sm:col-span-4"
                    />
                    <input
                      list="muscle-groups"
                      value={ex.muscleGroup}
                      onChange={(e) => updateExercise(day.dayOfWeek, ex.key, { muscleGroup: e.target.value })}
                      placeholder="Muscle group"
                      className="col-span-2 h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-primary sm:col-span-2"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={ex.targetSets}
                      onChange={(e) =>
                        updateExercise(day.dayOfWeek, ex.key, { targetSets: Number(e.target.value) || 1 })
                      }
                      title="Target sets"
                      className="h-8 rounded-md border border-input bg-transparent px-1 text-center text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={ex.targetRepsMin}
                      onChange={(e) =>
                        updateExercise(day.dayOfWeek, ex.key, { targetRepsMin: Number(e.target.value) || 1 })
                      }
                      title="Min reps"
                      className="h-8 rounded-md border border-input bg-transparent px-1 text-center text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={ex.targetRepsMax}
                      onChange={(e) =>
                        updateExercise(day.dayOfWeek, ex.key, { targetRepsMax: Number(e.target.value) || 1 })
                      }
                      title="Max reps"
                      className="h-8 rounded-md border border-input bg-transparent px-1 text-center text-sm outline-none focus:border-primary"
                    />
                    <select
                      value={ex.repsUnit}
                      onChange={(e) =>
                        updateExercise(day.dayOfWeek, ex.key, { repsUnit: e.target.value as "reps" | "seconds" })
                      }
                      className="h-8 rounded-md border border-input bg-transparent px-1 text-xs outline-none focus:border-primary"
                    >
                      <option value="reps">REPS</option>
                      <option value="seconds">SEC</option>
                    </select>
                    <label className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                      <Checkbox
                        checked={ex.perSide}
                        onCheckedChange={(checked) => updateExercise(day.dayOfWeek, ex.key, { perSide: checked })}
                      />
                      SIDE
                    </label>
                    <button
                      type="button"
                      onClick={() => removeExercise(day.dayOfWeek, ex.key)}
                      aria-label="Remove exercise"
                      className="flex h-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExercise(day.dayOfWeek)}
                  className="heading-system tracking-wide"
                >
                  <Plus className="h-3.5 w-3.5" /> ADD EXERCISE
                </Button>
              </div>
            )}
          </SystemPanel>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={pending} className="w-full heading-system tracking-widest">
        {pending ? "SAVING..." : existing ? "SAVE CHANGES" : "CREATE TEMPLATE"}
      </Button>
    </div>
  );
}
