"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LogOut } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { lbsToKg, feetInchesToCm } from "@/lib/nutrition";
import { activateTemplate, type TemplateSummaryDTO } from "@/actions/onboarding";
import type { ExperienceLevel } from "@/types";
import type { BiologicalSex, FitnessGoal, UnitSystem } from "@/lib/nutrition";

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to structured training." },
  { value: "intermediate", label: "Intermediate", description: "Training consistently for a while." },
  { value: "experienced", label: "Experienced", description: "Years of structured training experience." },
];

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unspecified", label: "Prefer not to say" },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string; description: string }[] = [
  { value: "lose_weight", label: "Lose Weight", description: "Calorie target set below maintenance." },
  { value: "maintain", label: "Maintain", description: "Calorie target at maintenance." },
  { value: "gain_muscle", label: "Build Muscle", description: "Calorie target above maintenance." },
];

const DAYS_OPTIONS = [3, 4, 5];
const STEPS = ["EXPERIENCE", "BODY STATS", "TRAINING DAYS", "ROUTINE"];

export function OnboardingWizard({
  playerName,
  templates,
}: {
  playerName: string;
  templates: TemplateSummaryDTO[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [weightInput, setWeightInput] = useState("");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFeetInput, setHeightFeetInput] = useState("");
  const [heightInchesInput, setHeightInchesInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(null);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);

  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

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

  const bodyStatsValid = weightKg != null && heightCm != null && age != null && biologicalSex != null && fitnessGoal != null;

  function handleActivate() {
    if (!experience || !daysPerWeek || !templateSlug || !bodyStatsValid) return;
    setError(null);
    startTransition(async () => {
      const result = await activateTemplate({
        experience,
        daysPerWeek,
        templateSlug,
        weightKg: weightKg!,
        heightCm: heightCm!,
        age: age!,
        biologicalSex: biologicalSex!,
        fitnessGoal: fitnessGoal!,
        unitSystem,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setActivated(true);
      setTimeout(() => router.push("/dashboard"), 1400);
    });
  }

  if (activated) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <SystemPanel variant="success" className="w-full py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Check className="h-8 w-8 text-glow-cyan" />
            <p className="label-system-accent tracking-[0.3em]">ROUTINE ACTIVATED</p>
            <p className="heading-system text-xl">SYSTEM READY, {playerName.toUpperCase()}</p>
          </motion.div>
        </SystemPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="heading-system tracking-wide"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
        <div className="text-center">
          <span className="font-heading text-2xl font-bold tracking-[0.3em] text-glow-cyan">LevelUp</span>
          <p className="label-system mt-1">Player Onboarding</p>
        </div>
      </div>

      <SystemPanel className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <SystemLabel>
              Step {step + 1} / {STEPS.length}
            </SystemLabel>
            <SystemLabel>{STEPS[step]}</SystemLabel>
          </div>
          <HudProgress percentage={((step + 1) / STEPS.length) * 100} />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="exp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <h2 className="heading-system text-lg">What is your training experience?</h2>
              <div className="space-y-2.5">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperience(opt.value)}
                    className={cn(
                      "w-full rounded-lg border p-3.5 text-left transition-colors",
                      experience === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    )}
                  >
                    <p className="heading-system text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="body-stats"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <div>
                <h2 className="heading-system text-lg">Tell us about yourself</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Powers real BMI, calorie, and macro calculations on the Diet &amp; Body page — not shared with anyone.
                </p>
              </div>

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
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={unitSystem === "metric" ? "e.g. 70" : "e.g. 154"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-system">Age</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={13}
                    max={100}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              {unitSystem === "metric" ? (
                <div className="space-y-1.5">
                  <Label className="label-system">Height (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={heightCmInput}
                    onChange={(e) => setHeightCmInput(e.target.value)}
                    placeholder="e.g. 175"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="label-system">Height (ft)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={heightFeetInput}
                      onChange={(e) => setHeightFeetInput(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="label-system">Height (in)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      value={heightInchesInput}
                      onChange={(e) => setHeightInchesInput(e.target.value)}
                      placeholder="e.g. 9"
                    />
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
                <div className="space-y-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFitnessGoal(opt.value)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        fitnessGoal === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                      )}
                    >
                      <p className="heading-system text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="days"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <h2 className="heading-system text-lg">How many days do you train?</h2>
              <div className="grid grid-cols-4 gap-2.5">
                {DAYS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDaysPerWeek(d);
                      setCustomDays("");
                    }}
                    className={cn(
                      "heading-system rounded-lg border py-3 text-center text-sm transition-colors",
                      daysPerWeek === d && customDays === ""
                        ? "border-primary bg-primary/10 text-glow-cyan"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    {d} DAYS
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={7}
                  placeholder="Custom"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value);
                    const n = Number(e.target.value);
                    setDaysPerWeek(n >= 1 && n <= 7 ? n : null);
                  }}
                  className="rounded-lg border border-border bg-transparent text-center text-sm outline-none focus:border-primary"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="routine"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <h2 className="heading-system text-lg">Select your first routine</h2>
              <div className="space-y-3">
                {templates.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setTemplateSlug(t.slug)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-colors",
                      templateSlug === t.slug ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    )}
                  >
                    <p className="heading-system text-base text-glow-cyan">{t.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.dayCount.workout} training days · {t.dayCount.rest} recovery day
                      {t.dayCount.rest === 1 ? "" : "s"} · {t.dayCount.optional} optional
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="heading-system tracking-widest"
              onClick={() => setStep((s) => s - 1)}
            >
              BACK
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="flex-1 heading-system tracking-widest"
              disabled={(step === 0 && !experience) || (step === 1 && !bodyStatsValid) || (step === 2 && !daysPerWeek)}
              onClick={() => setStep((s) => s + 1)}
            >
              CONTINUE
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 heading-system tracking-widest"
              disabled={!templateSlug || pending}
              onClick={handleActivate}
            >
              {pending ? "ACTIVATING..." : "ACTIVATE ROUTINE"}
            </Button>
          )}
        </div>
      </SystemPanel>
    </div>
  );
}
