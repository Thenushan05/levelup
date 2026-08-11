"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SetDTO } from "@/types";

export function SetRow({
  set,
  unit,
  onSave,
}: {
  set: SetDTO;
  unit: "reps" | "seconds";
  onSave: (setNumber: number, weight: number | null, reps: number | null, completed: boolean) => Promise<void>;
}) {
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : "");
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : "");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    const w = weight === "" ? 0 : Number(weight);
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
          {set.weight ?? 0} KG × {set.reps ?? 0} {unit === "seconds" ? "SEC" : ""}
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
    </div>
  );
}
