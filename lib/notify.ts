import { Notification } from "@/models/Notification";
import { GymGroup } from "@/models/GymGroup";
import { connectToDatabase } from "@/lib/mongodb";
import type { NotificationType } from "@/types";

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message = "",
  meta: Record<string, unknown> = {}
) {
  await connectToDatabase();
  await Notification.create({ userId, type, title, message, meta });
}

/**
 * Writes a personal notification AND, if the actor belongs to any party,
 * a matching activity-feed entry scoped to each group — this is what
 * powers "PARTY ACTIVITY" with real data instead of a separate mock feed.
 */
export async function notifyUserAndParty(
  actor: { id: string; name: string },
  personalType: NotificationType,
  partyType: NotificationType,
  title: string,
  message = "",
  meta: Record<string, unknown> = {}
) {
  await connectToDatabase();
  await Notification.create({ userId: actor.id, type: personalType, title, message, meta });

  const groups = await GymGroup.find({ "members.userId": actor.id }).select("_id").lean();
  if (groups.length === 0) return;

  await Notification.insertMany(
    groups.map((g) => ({
      userId: actor.id,
      groupId: g._id,
      type: partyType,
      title,
      message,
      meta,
      actorUserId: actor.id,
      actorName: actor.name,
    }))
  );
}
