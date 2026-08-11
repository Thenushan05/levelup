import { Achievement } from "@/models/Achievement";
import { UserAchievement } from "@/models/UserAchievement";
import { Attendance } from "@/models/Attendance";
import { connectToDatabase } from "@/lib/mongodb";
import { queueXpAward } from "@/lib/xp";
import type { AchievementUnlockedDTO } from "@/types";
import type { HydratedDocument } from "mongoose";
import type { UserDoc } from "@/models/User";

export type AchievementCriteriaType =
  | "total_workouts"
  | "weekly_quest_count"
  | "streak"
  | "level"
  | "rank"
  | "check_ins"
  | "month_one";

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  lockedDescription: string;
  xpReward: number;
  icon: string;
  criteriaType: AchievementCriteriaType;
  criteriaValue: number;
  sortOrder: number;
}

/**
 * The full achievement catalog. Every condition here is about showing up
 * and finishing quests, not overtraining — no achievement rewards skipping
 * rest, extreme volume, or daily-without-exception training.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: "first_quest",
    title: "First Quest",
    description: "Completed your first workout.",
    lockedDescription: "Complete your first workout to unlock.",
    xpReward: 50,
    icon: "Flag",
    criteriaType: "total_workouts",
    criteriaValue: 1,
    sortOrder: 10,
  },
  {
    key: "ten_quests",
    title: "Ten Quests",
    description: "Completed 10 workouts.",
    lockedDescription: "Complete 10 workouts to unlock.",
    xpReward: 100,
    icon: "ListChecks",
    criteriaType: "total_workouts",
    criteriaValue: 10,
    sortOrder: 20,
  },
  {
    key: "quarter_century",
    title: "Quarter Century",
    description: "Completed 25 workouts.",
    lockedDescription: "Complete 25 workouts to unlock.",
    xpReward: 150,
    icon: "Medal",
    criteriaType: "total_workouts",
    criteriaValue: 25,
    sortOrder: 30,
  },
  {
    key: "half_century",
    title: "Half Century",
    description: "Completed 50 workouts.",
    lockedDescription: "Complete 50 workouts to unlock.",
    xpReward: 250,
    icon: "Trophy",
    criteriaType: "total_workouts",
    criteriaValue: 50,
    sortOrder: 40,
  },
  {
    key: "centurion",
    title: "Centurion",
    description: "Completed 100 workouts.",
    lockedDescription: "Complete 100 workouts to unlock.",
    xpReward: 500,
    icon: "Crown",
    criteriaType: "total_workouts",
    criteriaValue: 100,
    sortOrder: 50,
  },
  {
    key: "consistent",
    title: "Consistent",
    description: "Completed all required workouts in a week.",
    lockedDescription: "Complete a full weekly quest to unlock.",
    xpReward: 100,
    icon: "CalendarCheck",
    criteriaType: "weekly_quest_count",
    criteriaValue: 1,
    sortOrder: 60,
  },
  {
    key: "dedicated",
    title: "Dedicated",
    description: "Completed 4 full weekly quests.",
    lockedDescription: "Complete 4 full weekly quests to unlock.",
    xpReward: 150,
    icon: "CalendarDays",
    criteriaType: "weekly_quest_count",
    criteriaValue: 4,
    sortOrder: 70,
  },
  {
    key: "week_streak",
    title: "Seven Day Streak",
    description: "Reached a 7-day consistency streak.",
    lockedDescription: "Reach a 7-day streak to unlock.",
    xpReward: 100,
    icon: "Flame",
    criteriaType: "streak",
    criteriaValue: 7,
    sortOrder: 80,
  },
  {
    key: "streak_master",
    title: "Streak Master",
    description: "Reached a 30-day consistency streak.",
    lockedDescription: "Reach a 30-day streak to unlock.",
    xpReward: 300,
    icon: "Flame",
    criteriaType: "streak",
    criteriaValue: 30,
    sortOrder: 90,
  },
  {
    key: "month_one",
    title: "Month One",
    description: "Completed your first full month of training.",
    lockedDescription: "Complete your first full month of training to unlock.",
    xpReward: 200,
    icon: "CalendarClock",
    criteriaType: "month_one",
    criteriaValue: 16,
    sortOrder: 100,
  },
  {
    key: "rank_d",
    title: "D-Rank Hunter",
    description: "Reached D Rank.",
    lockedDescription: "Reach D Rank (Level 6) to unlock.",
    xpReward: 75,
    icon: "Shield",
    criteriaType: "level",
    criteriaValue: 6,
    sortOrder: 110,
  },
  {
    key: "rank_c",
    title: "C-Rank Hunter",
    description: "Reached C Rank.",
    lockedDescription: "Reach C Rank (Level 11) to unlock.",
    xpReward: 150,
    icon: "ShieldHalf",
    criteriaType: "level",
    criteriaValue: 11,
    sortOrder: 120,
  },
  {
    key: "rank_b",
    title: "B-Rank Hunter",
    description: "Reached B Rank.",
    lockedDescription: "Reach B Rank (Level 21) to unlock.",
    xpReward: 250,
    icon: "ShieldCheck",
    criteriaType: "level",
    criteriaValue: 21,
    sortOrder: 130,
  },
  {
    key: "rank_a",
    title: "A-Rank Hunter",
    description: "Reached A Rank.",
    lockedDescription: "Reach A Rank (Level 36) to unlock.",
    xpReward: 400,
    icon: "ShieldPlus",
    criteriaType: "level",
    criteriaValue: 36,
    sortOrder: 140,
  },
  {
    key: "rank_s",
    title: "S-Rank Ascendant",
    description: "Reached S Rank.",
    lockedDescription: "Reach S Rank (Level 51) to unlock.",
    xpReward: 750,
    icon: "Sparkles",
    criteriaType: "level",
    criteriaValue: 51,
    sortOrder: 150,
  },
  {
    key: "gym_regular",
    title: "Gym Regular",
    description: "Checked into the gym 10 times.",
    lockedDescription: "Check into the gym 10 times to unlock.",
    xpReward: 50,
    icon: "DoorOpen",
    criteriaType: "check_ins",
    criteriaValue: 10,
    sortOrder: 160,
  },
  {
    key: "gym_veteran",
    title: "Gym Veteran",
    description: "Checked into the gym 50 times.",
    lockedDescription: "Check into the gym 50 times to unlock.",
    xpReward: 150,
    icon: "Dumbbell",
    criteriaType: "check_ins",
    criteriaValue: 50,
    sortOrder: 170,
  },
];

export async function ensureAchievementsSeeded() {
  await connectToDatabase();
  await Promise.all(
    ACHIEVEMENT_DEFINITIONS.map((def) =>
      Achievement.findOneAndUpdate(
        { key: def.key },
        { $setOnInsert: def },
        { upsert: true }
      )
    )
  );
}

interface UserStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  weeklyQuestsCompletedCount: number;
  checkIns: number;
}

function meetsCriteria(def: AchievementDefinition, stats: UserStats): boolean {
  switch (def.criteriaType) {
    case "total_workouts":
      return stats.totalWorkouts >= def.criteriaValue;
    case "weekly_quest_count":
      return stats.weeklyQuestsCompletedCount >= def.criteriaValue;
    case "streak":
      return Math.max(stats.currentStreak, stats.longestStreak) >= def.criteriaValue;
    case "level":
    case "rank":
      return stats.level >= def.criteriaValue;
    case "check_ins":
      return stats.checkIns >= def.criteriaValue;
    case "month_one":
      return stats.totalWorkouts >= def.criteriaValue;
    default:
      return false;
  }
}

/**
 * Checks every achievement the user hasn't unlocked yet and unlocks any that
 * now qualify (the badge itself shows immediately). Its XP reward is queued
 * for admin approval rather than applied — see queueXpAward. Returns the
 * list to show as unlock toasts.
 */
export async function checkAndUnlockAchievements(
  user: HydratedDocument<UserDoc>
): Promise<AchievementUnlockedDTO[]> {
  await ensureAchievementsSeeded();

  const [allAchievements, unlockedIds, checkIns] = await Promise.all([
    Achievement.find({}).lean(),
    UserAchievement.find({ userId: user._id }).distinct("achievementId"),
    Attendance.countDocuments({ userId: user._id }),
  ]);

  const unlockedSet = new Set(unlockedIds.map((id) => id.toString()));
  const stats: UserStats = {
    totalWorkouts: user.totalWorkouts,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    level: user.level,
    weeklyQuestsCompletedCount: user.weeklyQuestsCompletedCount,
    checkIns,
  };

  const newlyUnlocked: AchievementUnlockedDTO[] = [];

  for (const achievement of allAchievements) {
    if (unlockedSet.has(achievement._id.toString())) continue;
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === achievement.key);
    if (!def) continue;
    if (!meetsCriteria(def, stats)) continue;

    await UserAchievement.create({
      userId: user._id,
      achievementId: achievement._id,
      unlockedAt: new Date(),
    });
    await queueXpAward(user._id, achievement.xpReward, "achievement_unlocked", achievement.title);

    newlyUnlocked.push({
      key: achievement.key,
      title: achievement.title,
      description: achievement.description,
      xpReward: achievement.xpReward,
      icon: achievement.icon,
    });
  }

  return newlyUnlocked;
}
