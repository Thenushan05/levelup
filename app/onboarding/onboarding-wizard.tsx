"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { activateTemplate, type TemplateSummaryDTO } from "@/actions/onboarding";
import type { ExperienceLevel } from "@/types";

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to structured training." },
  { value: "intermediate", label: "Intermediate", description: "Training consistently for a while." },
  { value: "experienced", label: "Experienced", description: "Years of structured training experience." },
];

const DAYS_OPTIONS = [3, 4, 5];
const STEPS = ["EXPERIENCE", "TRAINING DAYS", "ROUTINE"];

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
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  function handleActivate() {
    if (!experience || !daysPerWeek || !templateSlug) return;
    setError(null);
    startTransition(async () => {
      const result = await activateTemplate({ experience, daysPerWeek, templateSlug });
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
      <div className="mb-6 text-center">
        <span className="font-heading text-2xl font-bold tracking-[0.3em] text-glow-cyan">ASCEND</span>
        <p className="label-system mt-1">Player Onboarding</p>
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

          {step === 2 && (
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
              disabled={(step === 0 && !experience) || (step === 1 && !daysPerWeek)}
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
