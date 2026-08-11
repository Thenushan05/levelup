"use server";

import { revalidatePath } from "next/cache";
import { Attendance } from "@/models/Attendance";
import { requireUserDoc } from "@/lib/session";
import { todayKey, formatTime } from "@/lib/dates";
import { queueXpAward, XP_VALUES } from "@/lib/xp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { notifyUserAndParty } from "@/lib/notify";
import type { AchievementUnlockedDTO } from "@/types";

export interface AttendanceStatusDTO {
  checkedIn: boolean;
  checkedInAt: string | null;
}

export async function getTodayAttendance(): Promise<AttendanceStatusDTO> {
  const user = await requireUserDoc();
  const record = await Attendance.findOne({ userId: user._id, date: todayKey() }).lean();
  return {
    checkedIn: !!record,
    checkedInAt: record ? new Date(record.checkedInAt).toISOString() : null,
  };
}

export interface CheckInResult {
  checkedInAt: string;
  xpPending: number;
  achievementsUnlocked: AchievementUnlockedDTO[];
}

/**
 * Only one check-in per calendar day — enforced by the unique {userId, date}
 * index. XP is queued for admin approval, not granted immediately (see
 * lib/xp.ts's queueXpAward) — the check-in itself still records instantly.
 */
export async function checkIn(): Promise<CheckInResult> {
  const user = await requireUserDoc();
  const date = todayKey();
  const checkedInAt = new Date();

  try {
    await Attendance.create({ userId: user._id, date, checkedInAt, xpAwarded: XP_VALUES.GYM_CHECK_IN });
  } catch {
    throw new Error("You've already checked in today.");
  }

  user.lastCheckInDate = date;
  await queueXpAward(user._id, XP_VALUES.GYM_CHECK_IN, "check_in", "Gym Check-In");

  const achievementsUnlocked = await checkAndUnlockAchievements(user);
  await user.save();

  await notifyUserAndParty(
    { id: user._id.toString(), name: user.name },
    "check_in",
    "party_check_in",
    `${user.name} checked into the gym.`,
    formatTime(checkedInAt),
    { xp: XP_VALUES.GYM_CHECK_IN, pending: true }
  );

  revalidatePath("/dashboard");

  return {
    checkedInAt: checkedInAt.toISOString(),
    xpPending: XP_VALUES.GYM_CHECK_IN + achievementsUnlocked.reduce((s, a) => s + a.xpReward, 0),
    achievementsUnlocked,
  };
}
