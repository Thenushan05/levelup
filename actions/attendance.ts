"use server";

import { revalidatePath } from "next/cache";
import type { HydratedDocument } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserDoc } from "@/lib/session";
import { todayKey, dayOfWeekFromKey, formatTime } from "@/lib/dates";
import { queueXpAward, XP_VALUES } from "@/lib/xp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { notifyUserAndParty } from "@/lib/notify";
import type { UserDoc } from "@/models/User";
import type { AchievementUnlockedDTO } from "@/types";

/** True if today's scheduled day (per the user's active template) is a rest day. No active template / no matching day = not a rest day. */
async function isTodayRestDay(user: HydratedDocument<UserDoc>): Promise<boolean> {
  if (!user.activeTemplateId) return false;
  const template = await WorkoutTemplate.findById(user.activeTemplateId).select("schedule").lean();
  if (!template) return false;
  const entry = template.schedule.find((d) => d.dayOfWeek === dayOfWeekFromKey(todayKey()));
  return entry?.type === "rest";
}

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

  if (await isTodayRestDay(user)) {
    throw new Error("It's a rest day — no check-in needed. Recover and come back tomorrow.");
  }

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
