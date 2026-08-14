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
import {
  createGroupSchema,
  joinGroupSchema,
  reactionSchema,
  activityCommentSchema,
  nudgeSchema,
  type CreateGroupInput,
  type JoinGroupInput,
  type ReactionInput,
  type ActivityCommentInput,
  type NudgeInput,
} from "@/lib/validations/party";
import { dayOfWeekFromKey, todayKey, weekRange } from "@/lib/dates";
import { requiredXpForLevel } from "@/lib/xp";
import { notifyUser } from "@/lib/notify";
import { sendEmail, cheerEmail } from "@/lib/email";
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

export type PartyActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createGroup(input: CreateGroupInput): Promise<PartyActionResult<PartySummaryDTO>> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();

  let group = null;
  for (let attempt = 0; attempt < 5 && !group; attempt++) {
    const inviteCode = nanoid();
    try {
      group = await GymGroup.create({
        name: parsed.data.name,
        inviteCode,
        ownerId: user._id,
        members: [{ userId: user._id, joinedAt: new Date() }],
      });
    } catch {
      // invite code collision — retry with a new code
    }
  }
  if (!group) return { success: false, error: "Could not create party. Please try again." };

  revalidatePath("/party");
  return {
    success: true,
    data: {
      id: group._id.toString(),
      name: group.name,
      inviteCode: group.inviteCode,
      isOwner: true,
      memberCount: 1,
    },
  };
}

export async function joinGroup(input: JoinGroupInput): Promise<PartyActionResult<PartySummaryDTO>> {
  const parsed = joinGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();

  const group = await GymGroup.findOne({ inviteCode: parsed.data.inviteCode });
  if (!group) return { success: false, error: "Invalid invite code." };

  const alreadyMember = group.members.some((m) => m.userId.toString() === user._id.toString());
  if (!alreadyMember) {
    group.members.push({ userId: user._id, joinedAt: new Date() });
    await group.save();
  }

  revalidatePath("/party");
  return {
    success: true,
    data: {
      id: group._id.toString(),
      name: group.name,
      inviteCode: group.inviteCode,
      isOwner: group.ownerId.toString() === user._id.toString(),
      memberCount: group.members.length,
    },
  };
}

/** Only the party's creator can delete it — checked against ownerId, not just membership.
 * Also cleans up the party's activity feed (Notification docs scoped to this groupId) so
 * nothing lingers pointing at a deleted party.
 *
 * Returns {success, error} instead of throwing: a thrown Error's message is redacted by Next.js
 * in production builds (see nudgeMember's comment for the full explanation), which would turn
 * "only the creator can delete this" into an opaque digest-only error for the client. */
export async function deleteParty(groupId: string): Promise<PartyActionResult<null>> {
  const userId = await requireUserId();

  const group = await GymGroup.findById(groupId).lean();
  if (!group) return { success: false, error: "Party not found." };
  if (group.ownerId.toString() !== userId) {
    return { success: false, error: "Only the party's creator can delete it." };
  }

  await GymGroup.findByIdAndDelete(groupId);
  await Notification.deleteMany({ groupId });

  revalidatePath("/party");
  return { success: true, data: null };
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
  /** This week's leaderboard #1 (see computeWeeklyCompletions/weeklyMvpUserId below) — the
   * same figure behind the Weekly tab's crown, surfaced here too so it's visible without
   * switching tabs. Naturally resets each week since it's derived live, not stored. */
  isMvp: boolean;
  isMe: boolean;
  /** The routine they're currently following — null if they haven't activated one. */
  templateName: string | null;
}

interface WeeklyCompletionRow {
  userId: string;
  name: string;
  image: string | null;
  level: number;
  completed: number;
  required: number;
}

/** This week's completed/required workout count per member — the figures behind the Weekly
 * leaderboard tab. Shared so the MVP crown (getPartyMembers) and the leaderboard
 * (getLeaderboard) can never disagree about who's actually on top. */
async function computeWeeklyCompletions(memberIds: Types.ObjectId[]): Promise<WeeklyCompletionRow[]> {
  const users = await User.find({ _id: { $in: memberIds } }).select("name image activeTemplateId level").lean();
  const today = todayKey();
  const week = weekRange(today);

  return Promise.all(
    users.map(async (u) => {
      const image = u.image ?? null;
      if (!u.activeTemplateId) {
        return { userId: u._id.toString(), name: u.name, image, level: u.level, completed: 0, required: 0 };
      }
      const template = await WorkoutTemplate.findById(u.activeTemplateId).lean();
      if (!template) {
        return { userId: u._id.toString(), name: u.name, image, level: u.level, completed: 0, required: 0 };
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
      return { userId: u._id.toString(), name: u.name, image, level: u.level, completed, required: requiredDates.length };
    })
  );
}

/** This week's leaderboard #1 — null if nobody's completed anything yet, or if there's an
 * exact tie for first (no single MVP to crown in that case). */
function weeklyMvpUserId(rows: WeeklyCompletionRow[]): string | null {
  const sorted = [...rows].sort((a, b) => b.completed - a.completed || b.level - a.level);
  const top = sorted[0];
  if (!top || top.completed === 0) return null;
  const tied = sorted.filter((r) => r.completed === top.completed && r.level === top.level);
  return tied.length === 1 ? top.userId : null;
}

export async function getPartyMembers(groupId: string): Promise<PartyMemberDTO[]> {
  const requesterId = await requireUserId();
  const group = await assertMembership(groupId, requesterId);

  const memberIds = group.members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } }).lean();
  const today = todayKey();
  const workouts = await DailyWorkout.find({ userId: { $in: memberIds }, date: today })
    .select("userId status type")
    .lean();
  const workoutByUser = new Map(workouts.map((w) => [w.userId.toString(), w]));
  const mvpUserId = weeklyMvpUserId(await computeWeeklyCompletions(memberIds));

  const templateIds = [...new Set(users.map((u) => u.activeTemplateId).filter((id) => id != null))];
  const templates = await WorkoutTemplate.find({ _id: { $in: templateIds } }).select("name").lean();
  const templateNameById = new Map(templates.map((t) => [t._id.toString(), t.name]));

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
        isMvp: u._id.toString() === mvpUserId,
        isMe: u._id.toString() === requesterId,
        templateName: u.activeTemplateId ? templateNameById.get(u.activeTemplateId.toString()) ?? null : null,
      };
    })
    .sort((a, b) => b.level - a.level);
}

/** Cheers per (actor, target) pair allowed per calendar day — enough to actually nudge someone
 * a few times over a day without it turning into spam. */
const MAX_CHEERS_PER_DAY = 5;

/**
 * A lightweight, rate-limited "cheer" — sends the target a personal notification, nothing
 * more. Client-side this is only offered next to members whose todayStatus is "not_started"
 * (see party-view.tsx), but the real guard here is just: shared party, not yourself, and at
 * most MAX_CHEERS_PER_DAY per target per day — nudging someone who's already started is
 * harmless, not worth blocking on a second server round trip to re-check their workout status.
 *
 * Returns {success, error} instead of throwing. This matters here specifically: Next.js
 * redacts a thrown Error's message in production builds down to a generic "Minified React
 * error #441 ... Server Components render" digest — so "You've already cheered them on today"
 * would silently become unreadable for every real user hitting an expected condition, not just
 * a genuine bug. Returning it as data instead means the exact message always reaches the client.
 */
export async function nudgeMember(input: NudgeInput): Promise<PartyActionResult<{ remaining: number }>> {
  const parsed = nudgeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await requireUserDoc();
  const targetId = parsed.data.memberUserId;

  if (targetId === actor._id.toString()) {
    return { success: false, error: "You can't cheer yourself on." };
  }

  const sharedGroup = await GymGroup.findOne({
    $and: [{ "members.userId": actor._id }, { "members.userId": new Types.ObjectId(targetId) }],
  }).lean();
  if (!sharedGroup) return { success: false, error: "You are not in a party with this member." };

  const today = todayKey();
  const nudgesToday = await Notification.countDocuments({
    userId: targetId,
    groupId: null,
    type: "nudge",
    "meta.nudgedBy": actor._id.toString(),
    "meta.date": today,
  });
  if (nudgesToday >= MAX_CHEERS_PER_DAY) {
    return { success: false, error: `You've already cheered them on ${MAX_CHEERS_PER_DAY} times today — that's the daily limit.` };
  }

  await notifyUser(targetId, "nudge", "Cheer Received", `${actor.name} is cheering you on 🔥`, {
    nudgedBy: actor._id.toString(),
    date: today,
  });

  // Best-effort — sendEmail() never throws, so a delivery failure never blocks the cheer itself
  // (the in-app notification above is the source of truth either way).
  const target = await User.findById(targetId).select("email").lean();
  if (target?.email) {
    await sendEmail({ to: target.email, ...cheerEmail(actor.name) });
  }

  return { success: true, data: { remaining: MAX_CHEERS_PER_DAY - nudgesToday - 1 } };
}

export interface ActivityReactionDTO {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ActivityCommentDTO {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface PartyActivityDTO {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorImage: string | null;
  title: string;
  message: string;
  createdAt: string;
  reactions: ActivityReactionDTO[];
  comments: ActivityCommentDTO[];
}

export async function getPartyActivity(groupId: string, limit = 30): Promise<PartyActivityDTO[]> {
  const userId = await requireUserId();
  await assertMembership(groupId, userId);

  const docs = await Notification.find({ groupId }).sort({ createdAt: -1 }).limit(limit).lean();

  const actorIds = [...new Set(docs.map((d) => d.actorUserId?.toString()).filter((id): id is string => !!id))];
  const actors = await User.find({ _id: { $in: actorIds } }).select("image").lean();
  const imageByActorId = new Map(actors.map((a) => [a._id.toString(), a.image ?? null]));

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
      actorUserId: d.actorUserId?.toString() ?? null,
      actorName: d.actorName ?? "System",
      actorImage: d.actorUserId ? (imageByActorId.get(d.actorUserId.toString()) ?? null) : null,
      title: d.title,
      message: d.message ?? "",
      createdAt: new Date(d.createdAt).toISOString(),
      reactions: Array.from(emojiCounts.entries()).map(([emoji, v]) => ({ emoji, ...v })),
      comments: (d.comments ?? []).map((c) => ({
        id: c._id.toString(),
        userName: c.userName,
        text: c.text,
        createdAt: new Date(c.createdAt).toISOString(),
      })),
    };
  });
}

export async function addActivityComment(input: ActivityCommentInput): Promise<PartyActionResult<ActivityCommentDTO>> {
  const parsed = activityCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await requireUserDoc();

    const notif = await Notification.findById(parsed.data.notificationId);
    if (!notif || !notif.groupId) return { success: false, error: "Activity not found." };
    await assertMembership(notif.groupId.toString(), user._id.toString());

    notif.comments.push({ userId: user._id, userName: user.name, text: parsed.data.text });
    await notif.save();
    revalidatePath("/party");

    const created = notif.comments[notif.comments.length - 1];
    return {
      success: true,
      data: {
        id: created._id.toString(),
        userName: created.userName,
        text: created.text,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (err) {
    // Covers assertMembership's throw (e.g. removed from the party mid-session) — converted
    // here rather than left to throw, since a thrown Error's message gets redacted to a generic
    // digest by Next.js in production (see nudgeMember's comment for the full explanation).
    return { success: false, error: err instanceof Error ? err.message : "Unable to post comment." };
  }
}

export async function reactToActivity(input: ReactionInput): Promise<PartyActionResult<null>> {
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const userId = await requireUserId();

    const notif = await Notification.findById(parsed.data.notificationId);
    if (!notif || !notif.groupId) return { success: false, error: "Activity not found." };
    await assertMembership(notif.groupId.toString(), userId);

    const idx = notif.reactions.findIndex((r) => r.userId.toString() === userId && r.emoji === parsed.data.emoji);
    if (idx >= 0) {
      notif.reactions.splice(idx, 1);
    } else {
      notif.reactions.push({ emoji: parsed.data.emoji, userId: new Types.ObjectId(userId) });
    }
    await notif.save();
    revalidatePath("/party");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unable to react." };
  }
}

export interface LeaderboardRowDTO {
  userId: string;
  name: string;
  image: string | null;
  level: number;
  completed: number;
  required: number;
}

export async function getLeaderboard(groupId: string): Promise<LeaderboardRowDTO[]> {
  const userId = await requireUserId();
  const group = await assertMembership(groupId, userId);

  const memberIds = group.members.map((m) => m.userId);
  const rows = await computeWeeklyCompletions(memberIds);

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
