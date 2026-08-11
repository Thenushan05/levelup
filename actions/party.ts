"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { Types } from "mongoose";
import { GymGroup } from "@/models/GymGroup";
import { User } from "@/models/User";
import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { Notification } from "@/models/Notification";
import { requireUserDoc, requireUserId, UnauthorizedError } from "@/lib/session";
import { createGroupSchema, joinGroupSchema, reactionSchema, type CreateGroupInput, type JoinGroupInput, type ReactionInput } from "@/lib/validations/party";
import { dayOfWeekFromKey, todayKey, weekRange } from "@/lib/dates";
import { requiredXpForLevel } from "@/lib/xp";
import type { Rank } from "@/types";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export interface PartySummaryDTO {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  memberCount: number;
}

export async function getMyParty(): Promise<PartySummaryDTO | null> {
  const userId = await requireUserId();
  const group = await GymGroup.findOne({ "members.userId": userId }).sort({ createdAt: -1 }).lean();
  if (!group) return null;

  return {
    id: group._id.toString(),
    name: group.name,
    inviteCode: group.inviteCode,
    isOwner: group.ownerId.toString() === userId,
    memberCount: group.members.length,
  };
}

export async function createGroup(input: CreateGroupInput): Promise<PartySummaryDTO> {
  const parsed = createGroupSchema.parse(input);
  const user = await requireUserDoc();

  let group = null;
  for (let attempt = 0; attempt < 5 && !group; attempt++) {
    const inviteCode = nanoid();
    try {
      group = await GymGroup.create({
        name: parsed.name,
        inviteCode,
        ownerId: user._id,
        members: [{ userId: user._id, joinedAt: new Date() }],
      });
    } catch {
      // invite code collision — retry with a new code
    }
  }
  if (!group) throw new Error("Could not create party. Please try again.");

  revalidatePath("/party");
  return {
    id: group._id.toString(),
    name: group.name,
    inviteCode: group.inviteCode,
    isOwner: true,
    memberCount: 1,
  };
}

export async function joinGroup(input: JoinGroupInput): Promise<PartySummaryDTO> {
  const parsed = joinGroupSchema.parse(input);
  const user = await requireUserDoc();

  const group = await GymGroup.findOne({ inviteCode: parsed.inviteCode });
  if (!group) throw new Error("SYSTEM ERROR: Invalid invite code.");

  const alreadyMember = group.members.some((m) => m.userId.toString() === user._id.toString());
  if (!alreadyMember) {
    group.members.push({ userId: user._id, joinedAt: new Date() });
    await group.save();
  }

  revalidatePath("/party");
  return {
    id: group._id.toString(),
    name: group.name,
    inviteCode: group.inviteCode,
    isOwner: group.ownerId.toString() === user._id.toString(),
    memberCount: group.members.length,
  };
}

async function assertMembership(groupId: string, userId: string) {
  const group = await GymGroup.findOne({ _id: groupId, "members.userId": userId }).lean();
  if (!group) throw new UnauthorizedError("SYSTEM ERROR: You are not a member of this party.");
  return group;
}

export interface PartyMemberDTO {
  userId: string;
  name: string;
  image: string | null;
  level: number;
  rank: string;
  todayStatus: "complete" | "in_progress" | "not_started" | "rest" | "optional" | "no_plan";
  online: boolean;
}

export async function getPartyMembers(groupId: string): Promise<PartyMemberDTO[]> {
  const userId = await requireUserId();
  const group = await assertMembership(groupId, userId);

  const memberIds = group.members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } }).lean();
  const today = todayKey();
  const workouts = await DailyWorkout.find({ userId: { $in: memberIds }, date: today })
    .select("userId status type")
    .lean();
  const workoutByUser = new Map(workouts.map((w) => [w.userId.toString(), w]));

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  return users
    .map((u) => {
      const wk = workoutByUser.get(u._id.toString());
      let todayStatus: PartyMemberDTO["todayStatus"] = "no_plan";
      if (wk) {
        todayStatus =
          wk.type === "rest"
            ? "rest"
            : wk.type === "optional"
              ? "optional"
              : wk.status === "complete"
                ? "complete"
                : wk.status === "in_progress"
                  ? "in_progress"
                  : "not_started";
      } else if (u.activeTemplateId) {
        todayStatus = "not_started";
      }
      return {
        userId: u._id.toString(),
        name: u.name,
        image: u.image ?? null,
        level: u.level,
        rank: u.rank,
        todayStatus,
        online: !!u.updatedAt && new Date(u.updatedAt) > fifteenMinAgo,
      };
    })
    .sort((a, b) => b.level - a.level);
}

export interface ActivityReactionDTO {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface PartyActivityDTO {
  id: string;
  actorName: string;
  title: string;
  message: string;
  createdAt: string;
  reactions: ActivityReactionDTO[];
}

export async function getPartyActivity(groupId: string, limit = 30): Promise<PartyActivityDTO[]> {
  const userId = await requireUserId();
  await assertMembership(groupId, userId);

  const docs = await Notification.find({ groupId }).sort({ createdAt: -1 }).limit(limit).lean();

  return docs.map((d) => {
    const emojiCounts = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of d.reactions ?? []) {
      const entry = emojiCounts.get(r.emoji) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (r.userId.toString() === userId) entry.reactedByMe = true;
      emojiCounts.set(r.emoji, entry);
    }
    return {
      id: d._id.toString(),
      actorName: d.actorName ?? "System",
      title: d.title,
      message: d.message ?? "",
      createdAt: new Date(d.createdAt).toISOString(),
      reactions: Array.from(emojiCounts.entries()).map(([emoji, v]) => ({ emoji, ...v })),
    };
  });
}

export async function reactToActivity(input: ReactionInput): Promise<void> {
  const parsed = reactionSchema.parse(input);
  const userId = await requireUserId();

  const notif = await Notification.findById(parsed.notificationId);
  if (!notif || !notif.groupId) throw new Error("Activity not found.");
  await assertMembership(notif.groupId.toString(), userId);

  const idx = notif.reactions.findIndex(
    (r) => r.userId.toString() === userId && r.emoji === parsed.emoji
  );
  if (idx >= 0) {
    notif.reactions.splice(idx, 1);
  } else {
    notif.reactions.push({ emoji: parsed.emoji, userId: new Types.ObjectId(userId) });
  }
  await notif.save();
  revalidatePath("/party");
}

export interface LeaderboardRowDTO {
  userId: string;
  name: string;
  level: number;
  completed: number;
  required: number;
}

export async function getLeaderboard(groupId: string): Promise<LeaderboardRowDTO[]> {
  const userId = await requireUserId();
  const group = await assertMembership(groupId, userId);

  const memberIds = group.members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } }).lean();
  const today = todayKey();
  const week = weekRange(today);

  const rows = await Promise.all(
    users.map(async (u) => {
      if (!u.activeTemplateId) {
        return { userId: u._id.toString(), name: u.name, level: u.level, completed: 0, required: 0 };
      }
      const template = await WorkoutTemplate.findById(u.activeTemplateId).lean();
      if (!template) {
        return { userId: u._id.toString(), name: u.name, level: u.level, completed: 0, required: 0 };
      }
      const requiredDates = week.filter((d) => {
        const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(d));
        return entry?.type === "workout";
      });
      const completed = await DailyWorkout.countDocuments({
        userId: u._id,
        date: { $in: requiredDates },
        status: "complete",
      });
      return { userId: u._id.toString(), name: u.name, level: u.level, completed, required: requiredDates.length };
    })
  );

  return rows.sort((a, b) => b.completed - a.completed || b.level - a.level);
}

export interface LevelLeaderboardRowDTO {
  userId: string;
  name: string;
  image: string | null;
  level: number;
  xp: number;
  requiredXp: number;
  rank: Rank;
  isMe: boolean;
}

/** Ranks party members head-to-head by level (then XP progress) so you can see exactly where you stand against your friends. */
export async function getLevelLeaderboard(groupId: string): Promise<LevelLeaderboardRowDTO[]> {
  const userId = await requireUserId();
  const group = await assertMembership(groupId, userId);

  const memberIds = group.members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } }).lean();

  return users
    .map((u) => ({
      userId: u._id.toString(),
      name: u.name,
      image: u.image ?? null,
      level: u.level,
      xp: u.xp,
      requiredXp: requiredXpForLevel(u.level),
      rank: u.rank as Rank,
      isMe: u._id.toString() === userId,
    }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);
}
