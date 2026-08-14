import { Notification } from "@/models/Notification";
import { GymGroup } from "@/models/GymGroup";
import { connectToDatabase } from "@/lib/mongodb";
import type { NotificationType } from "@/types";

/** Midnight at the end of "today" (local time, same convention as lib/dates.ts) — setHours(24, ...)
 * rolls over to 00:00 the next day regardless of the current time. Used as the party activity
 * feed's expiry: posted any time today, gone by tonight, not "24h from the exact moment". */
function nextMidnight(): Date {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

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

  const expiresAt = nextMidnight();
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
      expiresAt,
    }))
  );
}
