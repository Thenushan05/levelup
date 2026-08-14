import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReactionSchema = new Schema(
  {
    emoji: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const CommentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "GymGroup", default: null },

    type: {
      type: String,
      enum: [
        "quest_available",
        "objective_complete",
        "quest_complete",
        "level_up",
        "achievement_unlocked",
        "check_in",
        "weekly_quest_complete",
        "recovery_complete",
        "party_check_in",
        "party_quest_complete",
        "party_level_up",
        "party_achievement",
        "party_objective_complete",
        "nudge",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },

    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: null },

    reactions: { type: [ReactionSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },

    read: { type: Boolean, default: false },

    // Party activity feed entries only (see lib/notify.ts) — set to the midnight *following*
    // creation, not a fixed offset from it, so something posted at 11pm expires in an hour
    // while something posted at 12:01am lives almost a full day. Null for personal
    // notifications, which aren't touched by the TTL index below and persist until the user
    // clears them.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ groupId: 1, createdAt: -1 });

// expireAfterSeconds: 0 means "expire at the exact instant stored in this field" (as opposed
// to N seconds after it) — MongoDB's background TTL monitor deletes these once expiresAt is in
// the past, no cron job/app code needed. Documents where expiresAt is null (every personal
// notification) aren't a Date, so the TTL monitor skips them — matched by the partial filter
// too, which also keeps the index itself smaller.
NotificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } }
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

export const Notification: Model<NotificationDoc> =
  models.Notification || model<NotificationDoc>("Notification", NotificationSchema);
export default Notification;
