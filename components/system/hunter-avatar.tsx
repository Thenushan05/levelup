import { Sword, Swords, Ghost, Skull, Crown, Flame, Eye, Shield, Zap, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Original icon-based "Hunter" avatars — same "original geometric badge"
 * approach RankBadge already uses (icons + colors are generic/open-source
 * lucide-react glyphs, not any show's actual character art), just circular
 * and icon-based instead of hexagonal.
 *
 * No manual picker — an icon+color combo is deterministically derived from
 * the user's id, so it looks randomly assigned across different members
 * while staying stable for the same person across renders/sessions. A real
 * uploaded photo (User.image) always wins over it, if set.
 */
const AVATAR_ICONS = [Sword, Swords, Ghost, Skull, Crown, Flame, Eye, Shield, Zap, Moon];

const AVATAR_COLORS = [
  "oklch(0.83 0.17 213)", // cyan
  "oklch(0.78 0.19 296)", // violet
  "oklch(0.76 0.17 172)", // success green
  "oklch(0.75 0.18 55)", // amber
  "oklch(0.68 0.2 260)", // blue
  "oklch(0.65 0.24 25)", // rose
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SIZE_CLASSES = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-14 w-14" } as const;
const ICON_SIZE_CLASSES = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-6 w-6" } as const;

export function HunterAvatar({
  seed,
  image,
  size = "md",
  className,
}: {
  /** Stable per-user identity for the deterministic icon/color pick — use
   * the user's id, not their name, so it survives a display-name change and
   * two people with the same name never collide. */
  seed: string;
  /** A real uploaded profile picture (User.image), if set — takes priority
   * over the generated icon. */
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = SIZE_CLASSES[size];

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/user-chosen URLs, not a static local asset
      <img
        src={image}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", sizeClasses, className)}
      />
    );
  }

  const hash = hashSeed(seed);
  const Icon = AVATAR_ICONS[hash % AVATAR_ICONS.length];
  const color = AVATAR_COLORS[Math.floor(hash / AVATAR_ICONS.length) % AVATAR_COLORS.length];

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center rounded-full", sizeClasses, className)}
      style={{
        border: `1.5px solid ${color}`,
        background: `linear-gradient(155deg, color-mix(in oklch, ${color}, transparent 80%), color-mix(in oklch, ${color}, transparent 94%))`,
        filter: `drop-shadow(0 0 6px color-mix(in oklch, ${color}, transparent 55%))`,
      }}
    >
      <Icon className={ICON_SIZE_CLASSES[size]} style={{ color }} />
    </div>
  );
}
