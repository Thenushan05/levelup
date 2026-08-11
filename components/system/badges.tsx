import { cn } from "@/lib/utils";
import type { Rank } from "@/types";

export function RankBadge({ rank, size = "md", className }: { rank: Rank; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-10 w-10 text-base",
    lg: "h-14 w-14 text-2xl",
  }[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border font-heading font-bold",
        sizeClasses,
        className
      )}
      style={{
        borderColor: "var(--rank)",
        color: "var(--rank)",
        boxShadow: "0 0 14px -4px var(--rank)",
        background: "color-mix(in oklch, var(--rank), transparent 92%)",
      }}
    >
      {rank}
    </div>
  );
}

export function LevelBadge({ level, size = "md", className }: { level: number; size?: "sm" | "md" | "lg"; className?: string }) {
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
