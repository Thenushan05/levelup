"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HudProgress({
  percentage,
  className,
  trackClassName,
}: {
  percentage: number;
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <div className={cn("xp-track", trackClassName)}>
      <motion.div
        className={cn("xp-fill", className)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

export function XpBar({
  xp,
  requiredXp,
  className,
}: {
  xp: number;
  requiredXp: number;
  className?: string;
}) {
  const pct = requiredXp > 0 ? (xp / requiredXp) * 100 : 0;
  return (
    <div className={className}>
      <HudProgress percentage={pct} />
      <div className="mt-1.5 flex items-center justify-between font-heading text-xs tracking-wide text-muted-foreground">
        <span>
          {xp.toLocaleString()} / {requiredXp.toLocaleString()} XP
        </span>
        <span>{Math.floor(pct)}%</span>
      </div>
    </div>
  );
}
