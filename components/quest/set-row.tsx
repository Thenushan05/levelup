"use client";

import { useState } from "react";
import { Check, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dynamicCalorieRangeFor, hasDynamicCalorieData } from "@/lib/dynamic-calorie-table";
import type { SetDTO } from "@/types";

export function SetRow({
  set,
  unit,
  showWeight = true,
  onSave,
  exerciseSlug = null,
  bodyWeightKg = null,
}: {
  set: SetDTO;
  unit: "reps" | "seconds";
  /** Cardio and core movements carry no load — hide the KG field entirely rather than forcing a 0. */
  showWeight?: boolean;
  onSave: (setNumber: number, weight: number | null, reps: number | null, completed: boolean) => Promise<void>;
  /** This exercise's catalog slug — when it's covered by the dynamic weight/bodyweight
   * calorie table (lib/dynamic-calorie-table.ts), the weight field shows a live estimate as
   * it's typed, before the set is even saved. Null (or an uncovered exercise) shows nothing. */
  exerciseSlug?: string | null;
  bodyWeightKg?: number | null;
}) {
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : "");
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : "");
  const [saving, setSaving] = useState(false);

  const liveEstimate =
    showWeight && exerciseSlug ? dynamicCalorieRangeFor(exerciseSlug, weight === "" ? null : Number(weight), bodyWeightKg) : null;
  const needsBodyWeightForEstimate =
    showWeight && weight !== "" && bodyWeightKg == null && !!exerciseSlug && hasDynamicCalorieData(exerciseSlug);

  async function handleComplete() {
    const w = !showWeight || weight === "" ? null : Number(weight);
    const r = reps === "" ? 0 : Number(reps);
    setSaving(true);
    try {
      await onSave(set.setNumber, w, r, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleUncheck() {
    setSaving(true);
    try {
      await onSave(set.setNumber, set.weight, set.reps, false);
    } finally {
      setSaving(false);
    }
  }

  if (set.completed) {
    return (
      <button
        type="button"
        onClick={handleUncheck}
        disabled={saving}
        className="flex w-full items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-left transition-colors hover:bg-success/10 disabled:opacity-60"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="heading-system text-sm">SET {set.setNumber}</span>
        <span className="ml-auto text-sm text-muted-foreground">
          {showWeight && set.weight != null && set.weight > 0 ? `${set.weight} KG × ` : ""}
          {set.reps ?? 0} {unit === "seconds" ? "SEC" : "REPS"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
        {set.setNumber}
      </span>
      <span className="heading-system text-sm">SET {set.setNumber}</span>
      <div className="ml-auto flex items-center gap-2">
        {showWeight && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-8 w-16 text-center"
              placeholder="0"
            />
            <span className="text-xs text-muted-foreground">KG</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-8 w-16 text-center"
            placeholder="0"
          />
          <span className="text-xs text-muted-foreground">{unit === "seconds" ? "SEC" : "REPS"}</span>
        </div>
        <Button size="sm" onClick={handleComplete} disabled={saving} className="heading-system tracking-wide">
          {saving ? "..." : "DONE"}
        </Button>
      </div>

      {liveEstimate && (
        <div className="flex w-full items-center gap-1.5 pl-8 text-[11px] text-glow-cyan">
          <Flame className="h-3 w-3 shrink-0" />
          <span>
            ≈ {liveEstimate.min}–{liveEstimate.max} kcal at {liveEstimate.weightTierLabel} ({liveEstimate.bodyWeightBandLabel}{" "}
            bodyweight)
          </span>
        </div>
      )}
      {needsBodyWeightForEstimate && (
        <p className="w-full pl-8 text-[11px] text-muted-foreground">
          Add your bodyweight in Diet &amp; Body to see a live calorie estimate here.
        </p>
      )}
    </div>
  );
}
