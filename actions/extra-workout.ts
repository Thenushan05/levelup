"use server";

import { revalidatePath } from "next/cache";
import { ExtraWorkout, type ExtraWorkoutDoc } from "@/models/ExtraWorkout";
import { PendingXpAward } from "@/models/PendingXpAward";
import { requireUserDoc } from "@/lib/session";
import { todayKey } from "@/lib/dates";
import { queueXpAward, DAILY_EXTRA_XP_CAP } from "@/lib/xp";
import { computeExtraWorkoutXp } from "@/lib/extra-workout-xp";
import { notifyUserAndParty } from "@/lib/notify";
import { logExtraWorkoutSchema, type LogExtraWorkoutInput } from "@/lib/validations/extra-workout";
import type { CardioIntensity, ExtraWorkoutCategory, ExtraWorkoutDTO } from "@/types";

type LeanExtraWorkout = ExtraWorkoutDoc & { _id: unknown; createdAt: Date };

function toDTO(doc: LeanExtraWorkout): ExtraWorkoutDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    category: doc.category as ExtraWorkoutCategory,
    name: doc.name,
    sets: doc.sets ?? null,
    reps: doc.reps ?? null,
    weightKg: doc.weightKg ?? null,
    durationMin: doc.durationMin ?? null,
    durationSec: doc.durationSec ?? null,
    intensity: (doc.intensity as CardioIntensity | null) ?? null,
    notes: doc.notes ?? "",
    xpAwarded: doc.xpAwarded,
    xpBeforeCap: doc.xpBeforeCap,
    parWeightKg: doc.parWeightAtLog ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export interface ExtraWorkoutSummaryDTO {
  entries: ExtraWorkoutDTO[];
  xpUsedToday: number;
  xpRemainingToday: number;
  dailyCap: number;
  /** Null until the member saves body stats — XP falls back to a flat base award. */
  bodyWeightKg: number | null;
  heightCm: number | null;
}

export async function getTodayExtraWorkouts(): Promise<ExtraWorkoutSummaryDTO> {
  const user = await requireUserDoc();
  const date = todayKey();

  const docs = await ExtraWorkout.find({ userId: user._id, date }).sort({ createdAt: -1 }).lean();
  const entries = docs.map((d) => toDTO(d as LeanExtraWorkout));
  const xpUsedToday = entries.reduce((sum, e) => sum + e.xpAwarded, 0);

  return {
    entries,
    xpUsedToday,
    xpRemainingToday: Math.max(0, DAILY_EXTRA_XP_CAP - xpUsedToday),
    dailyCap: DAILY_EXTRA_XP_CAP,
    bodyWeightKg: user.weightKg ?? null,
    heightCm: user.heightCm ?? null,
  };
}

export type LogExtraWorkoutResult =
  | { success: true; data: { entry: ExtraWorkoutDTO; xpRemainingToday: number; cappedByDailyLimit: boolean } }
  | { success: false; error: string };

/**
 * Repeatable by design — a member can log as many extras as they actually do. Abuse is bounded
 * by DAILY_EXTRA_XP_CAP (entries past it still record for history and the party feed, at 0 XP)
 * and by the existing admin approval queue that every XP award passes through.
 *
 * Returns {success, error} rather than throwing because Next.js redacts thrown Error messages
 * in production builds (see actions/attendance.ts).
 */
export async function logExtraWorkout(input: LogExtraWorkoutInput): Promise<LogExtraWorkoutResult> {
  const user = await requireUserDoc();

  const parsed = logExtraWorkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Those workout details don't look right. Check the fields and try again." };
  }
  const data = parsed.data;

  const stats = { weightKg: user.weightKg ?? null, heightCm: user.heightCm ?? null };
  const breakdown = computeExtraWorkoutXp(
    {
      category: data.category,
      name: data.name,
      sets: "sets" in data ? data.sets : null,
      reps: "reps" in data ? data.reps : null,
      weightKg: "weightKg" in data ? data.weightKg : null,
      durationMin: "durationMin" in data ? data.durationMin : null,
      durationSec: "durationSec" in data ? data.durationSec : null,
      intensity: "intensity" in data ? data.intensity : null,
    },
    stats
  );

  const date = todayKey();
  const usedToday = await ExtraWorkout.aggregate<{ total: number }>([
    { $match: { userId: user._id, date } },
    { $group: { _id: null, total: { $sum: "$xpAwarded" } } },
  ]);
  const alreadyUsed = usedToday[0]?.total ?? 0;
  const remaining = Math.max(0, DAILY_EXTRA_XP_CAP - alreadyUsed);
  const awarded = Math.min(breakdown.xp, remaining);

  const awardId = awarded > 0 ? await queueXpAward(user._id, awarded, "extra_workout", data.name) : null;

  const doc = await ExtraWorkout.create({
    userId: user._id,
    date,
    category: data.category,
    name: data.name,
    notes: data.notes ?? "",
    sets: "sets" in data ? data.sets : null,
    reps: "reps" in data ? data.reps : null,
    weightKg: "weightKg" in data ? data.weightKg : null,
    durationMin: "durationMin" in data ? data.durationMin : null,
    durationSec: "durationSec" in data ? data.durationSec : null,
    intensity: "intensity" in data ? data.intensity : null,
    xpAwarded: awarded,
    xpBeforeCap: breakdown.xp,
    xpAwardId: awardId,
    bodyWeightAtLog: stats.weightKg,
    heightAtLog: stats.heightCm,
    parWeightAtLog: breakdown.parWeightKg,
  });

  await notifyUserAndParty(
    { id: user._id.toString(), name: user.name },
    "extra_workout",
    "party_extra_workout",
    `${user.name} put in overtime`,
    awarded > 0 ? `${data.name} — +${awarded} XP pending` : `${data.name} — daily bonus cap reached`,
    { extraWorkoutId: doc._id.toString(), category: data.category }
  );

  revalidatePath("/quest");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: {
      entry: toDTO(doc.toObject() as LeanExtraWorkout),
      xpRemainingToday: Math.max(0, remaining - awarded),
      cappedByDailyLimit: awarded < breakdown.xp,
    },
  };
}

export type DeleteExtraWorkoutResult = { success: true } | { success: false; error: string };

export async function deleteExtraWorkout(id: string): Promise<DeleteExtraWorkoutResult> {
  const user = await requireUserDoc();

  const doc = await ExtraWorkout.findOneAndDelete({ _id: id, userId: user._id });
  if (!doc) return { success: false, error: "That entry no longer exists." };

  // Only revoke XP that's still awaiting review — an approved award has already been spent.
  if (doc.xpAwardId) {
    await PendingXpAward.deleteOne({ _id: doc.xpAwardId, userId: user._id, status: "pending" });
  }

  revalidatePath("/quest");
  revalidatePath("/dashboard");
  return { success: true };
}
