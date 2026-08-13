"use client";

import { motion } from "framer-motion";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { cn } from "@/lib/utils";
import type { CatalogCalorieEstimate } from "@/lib/calories-burned";
import type { DailyWorkoutDTO } from "@/types";

const R = 80;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Progress tiers toward today's calorie-burn target — every tier still
 * reads as forward motion, never a scold, in the same "System" voice used
 * elsewhere in the app. */
const TIERS = [
  {
    max: 34,
    tone: "text-glow-violet",
    ringColor: "oklch(0.78 0.19 296)",
    label: "Warming Up",
    quote: "Every Gate starts with a single set — the burn is just getting started.",
  },
  {
    max: 67,
    tone: "text-glow-cyan",
    ringColor: "oklch(0.83 0.17 213)",
    label: "Burning Steady",
    quote: "Momentum is building. The System is tracking every calorie.",
  },
  {
    max: 101,
    tone: "text-glow-success",
    ringColor: "oklch(0.76 0.17 172)",
    label: "Near Target",
    quote: "Almost at today's burn target — finish strong.",
  },
] as const;

function tierFor(pct: number) {
  return TIERS.find((t) => pct < t.max) ?? TIERS[TIERS.length - 1];
}

/**
 * Circular ring gauge for today's calorie burn — kcal actually burned (sum
 * of completed exercises' fixed catalog ranges, see lib/calories-burned.ts)
 * as a fraction of today's full-routine target (sum over every scheduled
 * exercise), with the number centered inside the ring. Not a weight/duration
 * formula.
 */
export function HealthLevelGauge({
  quest,
  burned,
  target,
}: {
  quest: DailyWorkoutDTO | null;
  burned: CatalogCalorieEstimate | null;
  target: CatalogCalorieEstimate | null;
}) {
  const statusLine = (() => {
    if (!quest) return "No active routine — activate one to start tracking.";
    if (quest.type === "rest") return "Rest day — no calories tracked.";
    if (quest.type === "optional") return "Optional day — no calories tracked.";
    if (!target) return "No calorie data for today's exercises yet.";
    if (!burned) return "Complete an exercise to start tracking.";
    return null;
  })();

  const pct = target && burned ? Math.max(0, Math.min(100, (burned.kcal / target.kcal) * 100)) : 0;
  const tier = tierFor(pct);

  return (
    <SystemPanel className="space-y-4">
      <div className="flex items-center justify-between">
        <SystemLabel accent>Calorie Burn</SystemLabel>
        <SystemLabel>{target ? `GOAL ${target.kcal} KCAL` : "TODAY"}</SystemLabel>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[180px]">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx={100} cy={100} r={R} fill="none" stroke="currentColor" strokeWidth={14} className="text-muted" />
          <defs>
            <linearGradient id="calorieRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.68 0.2 260)" />
              <stop offset="50%" stopColor="oklch(0.83 0.17 213)" />
              <stop offset="100%" stopColor="oklch(0.76 0.17 172)" />
            </linearGradient>
          </defs>
          <motion.circle
            cx={100}
            cy={100}
            r={R}
            fill="none"
            stroke="url(#calorieRingGradient)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct / 100) }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 6px oklch(0.83 0.17 213 / 55%))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-heading text-3xl", tier.tone)}>{burned?.kcal ?? 0}</span>
          <span className="text-[11px] text-muted-foreground">KCAL</span>
          {target && <span className="mt-0.5 text-[11px] text-muted-foreground">{Math.floor(pct)}%</span>}
        </div>
      </div>

      {statusLine && <p className="text-center text-[11px] text-muted-foreground">{statusLine}</p>}

      <div className="space-y-1 border-t border-border/60 pt-2.5 text-center">
        <p className={cn("heading-system text-sm", tier.tone)}>{tier.label}</p>
        <p className="text-xs italic text-muted-foreground">&ldquo;{tier.quote}&rdquo;</p>
      </div>
    </SystemPanel>
  );
}
