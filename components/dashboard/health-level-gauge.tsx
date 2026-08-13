"use client";

import { motion } from "framer-motion";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { cn } from "@/lib/utils";
import type { CatalogCalorieEstimate } from "@/lib/calories-burned";
import type { DailyWorkoutDTO } from "@/types";

const CX = 100;
const CY = 100;
const R = 80;
const ARC_LENGTH = Math.PI * R; // semicircle circumference

function pointOnArc(fraction: number) {
  const angleRad = ((180 - fraction * 180) * Math.PI) / 180;
  return { x: CX + R * Math.cos(angleRad), y: CY - R * Math.sin(angleRad) };
}

const START = pointOnArc(0);
const END = pointOnArc(1);
const ARC_PATH = `M ${START.x} ${START.y} A ${R} ${R} 0 0 1 ${END.x} ${END.y}`;

/** Progress tiers toward today's calorie-burn target — every tier still
 * reads as forward motion, never a scold, in the same "System" voice used
 * elsewhere in the app. */
const TIERS = [
  {
    max: 34,
    tone: "text-glow-violet",
    needleColor: "oklch(0.78 0.19 296)",
    label: "Warming Up",
    quote: "Every Gate starts with a single set — the burn is just getting started.",
  },
  {
    max: 67,
    tone: "text-glow-cyan",
    needleColor: "oklch(0.83 0.17 213)",
    label: "Burning Steady",
    quote: "Momentum is building. The System is tracking every calorie.",
  },
  {
    max: 101,
    tone: "text-glow-success",
    needleColor: "oklch(0.76 0.17 172)",
    label: "Near Target",
    quote: "Almost at today's burn target — finish strong.",
  },
] as const;

function tierFor(pct: number) {
  return TIERS.find((t) => pct < t.max) ?? TIERS[TIERS.length - 1];
}

/**
 * Analog speedometer-style gauge for today's calorie burn — needle points at
 * kcal actually burned (sum of completed exercises' fixed catalog ranges,
 * see lib/calories-burned.ts) as a fraction of today's full-routine target
 * (sum over every scheduled exercise). Not a weight/duration formula.
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
  const needleAngle = -90 + (pct / 100) * 180;
  const tier = tierFor(pct);

  return (
    <SystemPanel className="space-y-4">
      <div className="flex items-center justify-between">
        <SystemLabel accent>Calorie Burn</SystemLabel>
        <SystemLabel>{target ? `GOAL ${target.kcal} KCAL` : "TODAY"}</SystemLabel>
      </div>

      <div className="mx-auto w-full max-w-[220px]">
        <svg viewBox="0 0 200 108" className="h-auto w-full overflow-visible">
          <defs>
            <linearGradient id="healthGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.68 0.2 260)" />
              <stop offset="50%" stopColor="oklch(0.83 0.17 213)" />
              <stop offset="100%" stopColor="oklch(0.76 0.17 172)" />
            </linearGradient>
          </defs>

          <path d={ARC_PATH} fill="none" stroke="currentColor" strokeWidth={10} strokeLinecap="round" className="text-muted" />

          <motion.path
            d={ARC_PATH}
            fill="none"
            stroke="url(#healthGaugeGradient)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            initial={{ strokeDashoffset: ARC_LENGTH }}
            animate={{ strokeDashoffset: ARC_LENGTH * (1 - pct / 100) }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 6px oklch(0.83 0.17 213 / 55%))" }}
          />

          <motion.line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 20}
            stroke={tier.needleColor}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ transformOrigin: `${CX}px ${CY}px`, filter: `drop-shadow(0 0 4px ${tier.needleColor})` }}
            initial={{ rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <circle cx={CX} cy={CY} r={6} fill={tier.needleColor} />
        </svg>

        <div className="mt-2 flex flex-col items-center text-center">
          <span className={cn("font-heading text-2xl", tier.tone)}>{burned?.kcal ?? 0} KCAL</span>
          <span className="text-[11px] text-muted-foreground">
            {statusLine ?? `${Math.floor(pct)}% of today's ${target?.kcal} kcal target`}
          </span>
        </div>
      </div>

      <div className="space-y-1 border-t border-border/60 pt-2.5 text-center">
        <p className={cn("heading-system text-sm", tier.tone)}>{tier.label}</p>
        <p className="text-xs italic text-muted-foreground">&ldquo;{tier.quote}&rdquo;</p>
      </div>
    </SystemPanel>
  );
}
