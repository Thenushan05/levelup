"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SystemLabel } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateBodyStats } from "@/actions/diet";
import { showSystemToast, showErrorToast } from "@/lib/toast-system";
import { lbsToKg, kgToLbs, feetInchesToCm, cmToFeetInches } from "@/lib/nutrition";
import type { BiologicalSex, FitnessGoal, UnitSystem } from "@/lib/nutrition";

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unspecified", label: "Prefer not to say" },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain_muscle", label: "Build Muscle" },
];

export interface BodyStatsInitial {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  biologicalSex: BiologicalSex | null;
  fitnessGoal: FitnessGoal | null;
  unitSystem: UnitSystem;
}

export function BodyStatsForm({ initial, onSaved }: { initial: BodyStatsInitial; onSaved?: () => void }) {
  const router = useRouter();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initial.unitSystem);
  const [weightInput, setWeightInput] = useState(
    initial.weightKg != null ? String(Math.round((initial.unitSystem === "metric" ? initial.weightKg : kgToLbs(initial.weightKg)) * 10) / 10) : ""
  );
  const initialFeetInches = initial.heightCm != null ? cmToFeetInches(initial.heightCm) : null;
  const [heightCmInput, setHeightCmInput] = useState(initial.heightCm != null ? String(Math.round(initial.heightCm)) : "");
  const [heightFeetInput, setHeightFeetInput] = useState(initialFeetInches ? String(initialFeetInches.feet) : "");
  const [heightInchesInput, setHeightInchesInput] = useState(initialFeetInches ? String(initialFeetInches.inches) : "");
  const [ageInput, setAgeInput] = useState(initial.age != null ? String(initial.age) : "");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(initial.biologicalSex);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(initial.fitnessGoal);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const weightKg = (() => {
    const n = Number(weightInput);
    if (!weightInput || Number.isNaN(n) || n <= 0) return null;
    return unitSystem === "metric" ? n : lbsToKg(n);
  })();

  const heightCm = (() => {
    if (unitSystem === "metric") {
      const n = Number(heightCmInput);
      return heightCmInput && !Number.isNaN(n) && n > 0 ? n : null;
    }
    const feet = Number(heightFeetInput);
    const inches = Number(heightInchesInput || "0");
    if (!heightFeetInput || Number.isNaN(feet) || Number.isNaN(inches)) return null;
    return feetInchesToCm(feet, inches);
  })();

  const age = (() => {
    const n = Number(ageInput);
    return ageInput && Number.isInteger(n) && n > 0 ? n : null;
  })();

  const valid = weightKg != null && heightCm != null && age != null && biologicalSex != null && fitnessGoal != null;

  function handleSubmit() {
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBodyStats({
        weightKg: weightKg!,
        heightCm: heightCm!,
        age: age!,
        biologicalSex: biologicalSex!,
        fitnessGoal: fitnessGoal!,
        unitSystem,
      });
      if (!result.success) {
        setError(result.error);
        showErrorToast(result.error);
        return;
      }
      showSystemToast("Body stats saved", "Your diet plan has been recalculated.");
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["metric", "imperial"] as UnitSystem[]).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnitSystem(u)}
            className={cn(
              "heading-system flex-1 rounded-lg border py-2 text-center text-xs tracking-wide transition-colors",
              unitSystem === u ? "border-primary bg-primary/10 text-glow-cyan" : "border-border hover:bg-accent"
            )}
          >
            {u === "metric" ? "METRIC (KG/CM)" : "IMPERIAL (LBS/FT-IN)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="label-system">Weight ({unitSystem === "metric" ? "kg" : "lbs"})</Label>
          <Input type="number" inputMode="decimal" min={0} value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="label-system">Age</Label>
          <Input type="number" inputMode="numeric" min={13} max={100} value={ageInput} onChange={(e) => setAgeInput(e.target.value)} />
        </div>
      </div>

      {unitSystem === "metric" ? (
        <div className="space-y-1.5">
          <Label className="label-system">Height (cm)</Label>
          <Input type="number" inputMode="decimal" min={0} value={heightCmInput} onChange={(e) => setHeightCmInput(e.target.value)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="label-system">Height (ft)</Label>
            <Input type="number" inputMode="numeric" min={0} value={heightFeetInput} onChange={(e) => setHeightFeetInput(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="label-system">Height (in)</Label>
            <Input type="number" inputMode="numeric" min={0} max={11} value={heightInchesInput} onChange={(e) => setHeightInchesInput(e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="label-system">Biological Sex</Label>
        <p className="text-[11px] text-muted-foreground">Used only for the BMR formula, which differs slightly by sex.</p>
        <div className="grid grid-cols-3 gap-2">
          {SEX_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBiologicalSex(opt.value)}
              className={cn(
                "heading-system rounded-lg border py-2.5 text-center text-[11px] tracking-wide transition-colors",
                biologicalSex === opt.value ? "border-primary bg-primary/10 text-glow-cyan" : "border-border hover:bg-accent"
              )}
            >
              {opt.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="label-system">Fitness Goal</Label>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFitnessGoal(opt.value)}
              className={cn(
                "heading-system rounded-lg border py-2.5 text-center text-[11px] tracking-wide transition-colors",
                fitnessGoal === opt.value ? "border-primary bg-primary/10 text-glow-cyan" : "border-border hover:bg-accent"
              )}
            >
              {opt.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={!valid || pending} className="w-full heading-system tracking-widest">
        {pending ? "SAVING..." : "SAVE BODY STATS"}
      </Button>
      {!valid && <SystemLabel>Fill in every field to save.</SystemLabel>}
    </div>
  );
}
