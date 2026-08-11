import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AchievementSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    lockedDescription: { type: String, required: true },
    xpReward: { type: Number, required: true },
    icon: { type: String, default: "Award" },
    criteriaType: {
      type: String,
      enum: [
        "total_workouts",
        "weekly_quest_count",
        "streak",
        "level",
        "rank",
        "check_ins",
        "month_one",
      ],
      required: true,
    },
    criteriaValue: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type AchievementDoc = InferSchemaType<typeof AchievementSchema>;

export const Achievement: Model<AchievementDoc> =
  models.Achievement || model<AchievementDoc>("Achievement", AchievementSchema);
export default Achievement;
