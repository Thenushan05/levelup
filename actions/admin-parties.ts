"use server";

import { revalidatePath } from "next/cache";
import { requireAdminDoc } from "@/lib/session";
import { connectToDatabase } from "@/lib/mongodb";
import { GymGroup } from "@/models/GymGroup";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";

export interface AdminPartySummaryDTO {
  id: string;
  name: string;
  inviteCode: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
}

export async function getAllPartiesAdmin(): Promise<AdminPartySummaryDTO[]> {
  await requireAdminDoc();
  await connectToDatabase();

  const groups = await GymGroup.find({}).sort({ createdAt: -1 }).lean();
  const owners = await User.find({ _id: { $in: groups.map((g) => g.ownerId) } })
    .select("name")
    .lean();
  const ownerNameById = new Map(owners.map((o) => [o._id.toString(), o.name]));

  return groups.map((g) => ({
    id: g._id.toString(),
    name: g.name,
    inviteCode: g.inviteCode,
    ownerName: ownerNameById.get(g.ownerId.toString()) ?? "Unknown",
    memberCount: g.members.length,
    createdAt: new Date(g.createdAt).toISOString(),
  }));
}

export type DeletePartyResult = { success: true } | { success: false; error: string };

/**
 * Admin override for party deletion — bypasses the owner-only check in actions/party.ts's
 * deleteParty() so a site admin can remove any party (abandoned, abusive, duplicate, etc.),
 * not just the ones they personally created. Same cleanup: the group itself plus its
 * activity feed (Notification docs scoped to this groupId).
 */
export async function deletePartyAdmin(groupId: string): Promise<DeletePartyResult> {
  await requireAdminDoc();
  await connectToDatabase();

  const group = await GymGroup.findById(groupId);
  if (!group) {
    return { success: false, error: "Party not found." };
  }

  await GymGroup.findByIdAndDelete(groupId);
  await Notification.deleteMany({ groupId });

  revalidatePath("/admin/parties");
  revalidatePath("/party");
  return { success: true };
}
