"use server";

import { revalidatePath } from "next/cache";
import { Notification } from "@/models/Notification";
import { requireUserId } from "@/lib/session";
import type { NotificationType } from "@/types";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(limit = 20): Promise<NotificationDTO[]> {
  const userId = await requireUserId();
  const docs = await Notification.find({ userId, groupId: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map((d) => ({
    id: d._id.toString(),
    type: d.type as NotificationType,
    title: d.title,
    message: d.message ?? "",
    meta: (d.meta as Record<string, unknown>) ?? {},
    read: d.read,
    createdAt: new Date(d.createdAt).toISOString(),
  }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await requireUserId();
  return Notification.countDocuments({ userId, groupId: null, read: false });
}

export async function markNotificationsRead(): Promise<void> {
  const userId = await requireUserId();
  await Notification.updateMany({ userId, groupId: null, read: false }, { $set: { read: true } });
  revalidatePath("/dashboard");
}

/** Deletes every personal notification for the current user (not the party activity feed). */
export async function clearNotifications(): Promise<void> {
  const userId = await requireUserId();
  await Notification.deleteMany({ userId, groupId: null });
  revalidatePath("/dashboard");
}
