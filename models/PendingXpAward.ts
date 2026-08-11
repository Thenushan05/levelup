import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PendingXpAwardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      enum: ["check_in", "exercise_complete", "quest_complete", "weekly_quest_complete", "achievement_unlocked"],
      required: true,
    },
    // Human-readable context, e.g. "Bench Press", "Upper Body A", "Gym Check-In", achievement title.
    title: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PendingXpAwardSchema.index({ status: 1, createdAt: 1 });
PendingXpAwardSchema.index({ userId: 1, status: 1 });

export type PendingXpAwardDoc = InferSchemaType<typeof PendingXpAwardSchema>;

export const PendingXpAward: Model<PendingXpAwardDoc> =
  models.PendingXpAward || model<PendingXpAwardDoc>("PendingXpAward", PendingXpAwardSchema);
export default PendingXpAward;
