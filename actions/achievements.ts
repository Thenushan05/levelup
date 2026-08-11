"use server";

import { Achievement } from "@/models/Achievement";
import { UserAchievement } from "@/models/UserAchievement";
import { requireUserDoc } from "@/lib/session";
import { ensureAchievementsSeeded } from "@/lib/achievements";

export interface AchievementCardDTO {
  key: string;
  title: string | null;
  description: string;
  xpReward: number;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementsPageDTO {
  unlockedCount: number;
  total: number;
  achievements: AchievementCardDTO[];
}

export async function getAchievements(): Promise<AchievementsPageDTO> {
  const user = await requireUserDoc();
  await ensureAchievementsSeeded();

  const [all, unlocked] = await Promise.all([
    Achievement.find({}).sort({ sortOrder: 1 }).lean(),
    UserAchievement.find({ userId: user._id }).lean(),
  ]);

  const unlockedMap = new Map(unlocked.map((ua) => [ua.achievementId.toString(), ua.unlockedAt]));

  const cards: AchievementCardDTO[] = all.map((a) => {
    const unlockedAt = unlockedMap.get(a._id.toString());
    const isUnlocked = !!unlockedAt;
    return {
      key: a.key,
      title: isUnlocked ? a.title : null,
      description: isUnlocked ? a.description : a.lockedDescription,
      xpReward: a.xpReward,
      icon: a.icon,
      unlocked: isUnlocked,
      unlockedAt: unlockedAt ? new Date(unlockedAt).toISOString() : null,
    };
  });

  return {
    unlockedCount: cards.filter((c) => c.unlocked).length,
    total: cards.length,
    achievements: cards,
  };
}
