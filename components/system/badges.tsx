import { cn } from "@/lib/utils";
import type { Rank } from "@/types";

const HEX_CLIP = "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

/** A hexagonal rank emblem — an original geometric badge shape, not any specific show's insignia. */
export function RankBadge({
  rank,
  size = "md",
  className,
}: {
  rank: Rank;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-base",
    lg: "h-16 w-16 text-2xl",
  }[size];

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses, className)}>
      <div
        className="absolute inset-0"
        style={{
          clipPath: HEX_CLIP,
          border: "2px solid var(--rank)",
          background:
            "linear-gradient(155deg, color-mix(in oklch, var(--rank), transparent 78%), color-mix(in oklch, var(--rank), transparent 92%))",
          filter: "drop-shadow(0 0 10px color-mix(in oklch, var(--rank), transparent 30%))",
        }}
      />
      <span
        className="relative font-heading font-bold"
        style={{ color: "var(--rank)", textShadow: "0 0 10px color-mix(in oklch, var(--rank), transparent 25%)" }}
      >
        {rank}
      </span>
    </div>
  );
}

export function LevelBadge({
  level,
  size = "md",
  className,
}: {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl",
  }[size];

  return (
    <div
      className={cn(
        "system-panel flex items-center justify-center rounded-full font-heading font-bold text-glow-cyan",
        sizeClasses,
        className
      )}
    >
      {level}
    </div>
  );
}
