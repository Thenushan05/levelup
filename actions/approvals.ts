"use server";

import { revalidatePath } from "next/cache";
import { Types, type HydratedDocument } from "mongoose";
import { requireAdminDoc, requireUserId } from "@/lib/session";
import { connectToDatabase } from "@/lib/mongodb";
import { PendingXpAward, type PendingXpAwardDoc } from "@/models/PendingXpAward";
import { User, type UserDoc } from "@/models/User";
import { applyXp, snapshotLevel, diffLevel } from "@/lib/xp";
import { notifyUser, notifyUserAndParty } from "@/lib/notify";

export interface PendingApprovalDTO {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  title: string;
  createdAt: string;
}

export async function getPendingApprovals(): Promise<PendingApprovalDTO[]> {
  await requireAdminDoc();
  await connectToDatabase();

  const awards = await PendingXpAward.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .populate<{ userId: { _id: unknown; name: string } }>("userId", "name")
    .lean();

  return awards
    .filter((a) => a.userId) // skip orphaned awards whose user was deleted
    .map((a) => ({
      id: a._id.toString(),
      userId: String(a.userId._id),
      userName: a.userId.name,
      amount: a.amount,
      reason: a.reason,
      title: a.title,
      createdAt: new Date(a.createdAt).toISOString(),
    }));
}

export async function getPendingXpTotal(): Promise<number> {
  const userId = await requireUserId();
  await connectToDatabase();
  const rows = await PendingXpAward.aggregate([
    { $match: { userId: new Types.ObjectId(userId), status: "pending" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return rows[0]?.total ?? 0;
}

export async function getPendingApprovalCount(): Promise<number> {
  await requireAdminDoc();
  await connectToDatabase();
  return PendingXpAward.countDocuments({ status: "pending" });
}

async function applyApprovedAward(
  admin: HydratedDocument<UserDoc>,
  award: HydratedDocument<PendingXpAwardDoc>
): Promise<void> {
  const user = await User.findById(award.userId);
  if (!user) {
    award.status = "rejected";
    award.reviewedBy = admin._id;
    award.reviewedAt = new Date();
    await award.save();
    return;
  }

  const before = snapshotLevel(user);
  applyXp(user, award.amount);
  await user.save();

  award.status = "approved";
  award.reviewedBy = admin._id;
  award.reviewedAt = new Date();
  await award.save();

  await notifyUser(user._id.toString(), "objective_complete", "XP Approved", `${award.title} · +${award.amount} XP`, {
    xp: award.amount,
    approved: true,
  });

  const levelUp = diffLevel(before, user);
  if (levelUp.leveledUp) {
    await notifyUserAndParty(
      { id: user._id.toString(), name: user.name },
      "level_up",
      "party_level_up",
      `${user.name} reached Level ${levelUp.toLevel}.`,
      levelUp.rankChanged ? `Rank up: ${levelUp.toRank} Rank` : "",
      { fromLevel: levelUp.fromLevel, toLevel: levelUp.toLevel }
    );
  }
}

export async function approveXpAward(id: string) {
  const admin = await requireAdminDoc();
  await connectToDatabase();

  const award = await PendingXpAward.findOne({ _id: id, status: "pending" });
  if (!award) {
    return { success: false as const, error: "This request is no longer pending." };
  }

  await applyApprovedAward(admin, award);

  revalidatePath("/admin/approvals");
  revalidatePath("/dashboard");
  return { success: true as const };
}

export async function rejectXpAward(id: string) {
  const admin = await requireAdminDoc();
  await connectToDatabase();

  const award = await PendingXpAward.findOne({ _id: id, status: "pending" });
  if (!award) {
    return { success: false as const, error: "This request is no longer pending." };
  }

  award.status = "rejected";
  award.reviewedBy = admin._id;
  award.reviewedAt = new Date();
  await award.save();

  revalidatePath("/admin/approvals");
  return { success: true as const };
}

export async function approveAllPending(): Promise<{ approved: number }> {
  const admin = await requireAdminDoc();
  await connectToDatabase();

  const pending = await PendingXpAward.find({ status: "pending" });
  for (const award of pending) {
    await applyApprovedAward(admin, award);
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/dashboard");
  return { approved: pending.length };
}
