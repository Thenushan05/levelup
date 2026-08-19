"use server";

import { revalidatePath } from "next/cache";
import { requireAdminDoc } from "@/lib/session";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { DailyWorkout } from "@/models/DailyWorkout";
import { UserAchievement } from "@/models/UserAchievement";
import { PendingXpAward } from "@/models/PendingXpAward";
import { Notification } from "@/models/Notification";
import { GymGroup } from "@/models/GymGroup";
import { applyXp, snapshotLevel, diffLevel } from "@/lib/xp";
import { notifyUser, notifyUserAndParty } from "@/lib/notify";

export interface AdminUserSummaryDTO {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  rank: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  totalWorkouts: number;
  currentStreak: number;
  createdAt: string;
}

export async function getAllUsersAdmin(): Promise<AdminUserSummaryDTO[]> {
  await requireAdminDoc();
  await connectToDatabase();

  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    level: u.level,
    xp: u.xp,
    rank: u.rank,
    isAdmin: !!u.isAdmin,
    onboardingCompleted: !!u.onboardingCompleted,
    totalWorkouts: u.totalWorkouts,
    currentStreak: u.currentStreak,
    createdAt: new Date(u.createdAt).toISOString(),
  }));
}

export type DeleteUserResult = { success: true } | { success: false; error: string };

/**
 * Permanently deletes a user account and everything that references it —
 * the same cascade a manual DB cleanup would need, but as a real, guarded
 * admin action instead of a one-off script. Every collection with a
 * User reference gets handled:
 *   - Attendance, DailyWorkout, UserAchievement, PendingXpAward: owned
 *     records deleted outright.
 *   - PendingXpAward.reviewedBy: nulled out if this user reviewed others'
 *     awards (informational field, never re-derived).
 *   - Notification: deleted wherever this user is the owner OR the actor
 *     (party-feed entries about them), and their reactions are pulled from
 *     everyone else's notifications too.
 *   - GymGroup: removed from every group's member list; if they owned a
 *     group, ownership transfers to the earliest-joined remaining member,
 *     or the group is deleted if no one else is left in it.
 */
export async function deleteUserAccount(targetUserId: string): Promise<DeleteUserResult> {
  const admin = await requireAdminDoc();
  await connectToDatabase();

  if (admin._id.toString() === targetUserId) {
    return { success: false, error: "You can't delete your own account while logged in as it." };
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    return { success: false, error: "User not found." };
  }

  await Attendance.deleteMany({ userId: target._id });
  await DailyWorkout.deleteMany({ userId: target._id });
  await UserAchievement.deleteMany({ userId: target._id });
  await PendingXpAward.deleteMany({ userId: target._id });
  await PendingXpAward.updateMany({ reviewedBy: target._id }, { $set: { reviewedBy: null } });

  await Notification.deleteMany({ $or: [{ userId: target._id }, { actorUserId: target._id }] });
  await Notification.updateMany({}, { $pull: { reactions: { userId: target._id } } });

  await GymGroup.updateMany({ "members.userId": target._id }, { $pull: { members: { userId: target._id } } });
  const ownedGroups = await GymGroup.find({ ownerId: target._id });
  for (const group of ownedGroups) {
    const remaining = [...group.members].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
    if (remaining.length > 0) {
      group.ownerId = remaining[0].userId;
      await group.save();
    } else {
      await GymGroup.deleteOne({ _id: group._id });
    }
  }

  await User.deleteOne({ _id: target._id });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Sanity ceiling on a single manual grant — well above WEEK_XP (370), but still
 * guards against a fat-fingered extra zero going straight to a user's account. */
const MAX_MANUAL_XP_GRANT = 10000;

export type GrantXpResult =
  | { success: true; leveledUp: boolean; toLevel: number }
  | { success: false; error: string };

/**
 * Unlike every other XP-earning event, this doesn't go through queueXpAward's
 * pending-review queue — the admin granting it manually IS the approval
 * decision. It still writes a PendingXpAward row (pre-"approved", reviewedBy
 * the granting admin) purely as an audit trail, mirroring how approveXpAward
 * settles a normal award, and follows the same notify + level-up-announce
 * shape so the player sees it the same way any other approved XP arrives.
 */
export async function grantManualXp(targetUserId: string, amount: number, reason: string): Promise<GrantXpResult> {
  const admin = await requireAdminDoc();
  await connectToDatabase();

  if (!Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: "Enter a whole number of XP greater than 0." };
  }
  if (amount > MAX_MANUAL_XP_GRANT) {
    return { success: false, error: `That's too much XP to grant at once (max ${MAX_MANUAL_XP_GRANT.toLocaleString()}).` };
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    return { success: false, error: "User not found." };
  }

  const title = reason.trim() || "Manual Admin Grant";

  const before = snapshotLevel(target);
  applyXp(target, amount);
  await target.save();

  await PendingXpAward.create({
    userId: target._id,
    amount,
    reason: "admin_grant",
    title,
    status: "approved",
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });

  await notifyUser(target._id.toString(), "objective_complete", "XP Granted", `${title} · +${amount} XP`, {
    xp: amount,
    approved: true,
    grantedBy: admin.name,
  });

  const levelUp = diffLevel(before, target);
  if (levelUp.leveledUp) {
    await notifyUserAndParty(
      { id: target._id.toString(), name: target.name },
      "level_up",
      "party_level_up",
      `${target.name} reached Level ${levelUp.toLevel}.`,
      levelUp.rankChanged ? `Rank up: ${levelUp.toRank} Rank` : "",
      { fromLevel: levelUp.fromLevel, toLevel: levelUp.toLevel }
    );
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return { success: true, leveledUp: levelUp.leveledUp, toLevel: target.level };
}
