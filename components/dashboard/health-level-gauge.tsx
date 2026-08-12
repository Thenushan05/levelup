"use client";

import { motion } from "framer-motion";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { cn } from "@/lib/utils";

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

/** XP-progress tiers — every tier still reads as forward motion, never a
 * scold, in the same Solo Leveling "System" voice as the BMI readout. */
const TIERS = [
  {
    max: 34,
    tone: "text-glow-violet",
    needleColor: "oklch(0.78 0.19 296)",
    label: "Early Grind",
    quote: "The grind has just begun — even an E-Rank hunter cleared their first Gate somehow.",
  },
  {
    max: 67,
    tone: "text-glow-cyan",
    needleColor: "oklch(0.83 0.17 213)",
    label: "Building Momentum",
    quote: "Momentum is building. The System is watching — don't stop now.",
  },
  {
    max: 101,
    tone: "text-glow-success",
    needleColor: "oklch(0.76 0.17 172)",
    label: "Nearing Level Up",
    quote: "So close to your next level — one more quest could tip the scale. Arise.",
  },
] as const;

function tierFor(pct: number) {
  return TIERS.find((t) => pct < t.max) ?? TIERS[TIERS.length - 1];
}

/**
 * Analog speedometer-style gauge for "Health Level" — the player's XP
 * progress toward their next level, rendered as a needle dial instead of a
 * flat bar so it reads as a status the player is climbing, not just a
 * number. Paired with a short System quote for the current tier.
 */
export function HealthLevelGauge({ level, xp, requiredXp }: { level: number; xp: number; requiredXp: number }) {
  const pct = requiredXp > 0 ? Math.max(0, Math.min(100, (xp / requiredXp) * 100)) : 0;
  const needleAngle = -90 + (pct / 100) * 180;
  const tier = tierFor(pct);

  return (
    <SystemPanel className="space-y-4">
      <div className="flex items-center justify-between">
        <SystemLabel accent>Health Level</SystemLabel>
        <SystemLabel>LV.{level}</SystemLabel>
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
          <span className={cn("font-heading text-2xl", tier.tone)}>{Math.floor(pct)}%</span>
          <span className="text-[11px] text-muted-foreground">
            {xp.toLocaleString()} / {requiredXp.toLocaleString()} XP TO NEXT LEVEL
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
