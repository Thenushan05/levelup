import type { Rank } from "@/types";

/**
 * Ranks are cosmetic motivation only — they never gate features, they just
 * reflect accumulated level as a badge of long-term consistency.
 */
export const RANK_THRESHOLDS: { rank: Rank; minLevel: number; maxLevel: number | null }[] = [
  { rank: "E", minLevel: 1, maxLevel: 5 },
  { rank: "D", minLevel: 6, maxLevel: 10 },
  { rank: "C", minLevel: 11, maxLevel: 20 },
  { rank: "B", minLevel: 21, maxLevel: 35 },
  { rank: "A", minLevel: 36, maxLevel: 50 },
  { rank: "S", minLevel: 51, maxLevel: null },
];

export function getRankForLevel(level: number): Rank {
  const match = RANK_THRESHOLDS.find(
    (t) => level >= t.minLevel && (t.maxLevel === null || level <= t.maxLevel)
  );
  return match?.rank ?? "E";
}

export function getRankProgress(level: number): {
  rank: Rank;
  nextRank: Rank | null;
  levelsToNextRank: number | null;
} {
  const idx = RANK_THRESHOLDS.findIndex(
    (t) => level >= t.minLevel && (t.maxLevel === null || level <= t.maxLevel)
  );
  const current = RANK_THRESHOLDS[idx] ?? RANK_THRESHOLDS[0];
  const next = RANK_THRESHOLDS[idx + 1] ?? null;
  return {
    rank: current.rank,
    nextRank: next?.rank ?? null,
    levelsToNextRank: next ? next.minLevel - level : null,
  };
}
