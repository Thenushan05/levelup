import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserAchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement", required: true },
    unlockedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export type UserAchievementDoc = InferSchemaType<typeof UserAchievementSchema>;

export const UserAchievement: Model<UserAchievementDoc> =
  models.UserAchievement || model<UserAchievementDoc>("UserAchievement", UserAchievementSchema);
export default UserAchievement;
