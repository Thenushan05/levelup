import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    image: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },

    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    rank: {
      type: String,
      enum: ["E", "D", "C", "B", "A", "S"],
      default: "E",
    },

    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    totalWorkouts: { type: Number, default: 0, min: 0 },

    experience: {
      type: String,
      enum: ["beginner", "intermediate", "experienced"],
      default: null,
    },
    daysPerWeek: { type: Number, default: null },
    activeTemplateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate", default: null },
    onboardingCompleted: { type: Boolean, default: false },

    lastWeeklyQuestClaimedWeek: { type: String, default: null },
    weeklyQuestsCompletedCount: { type: Number, default: 0 },
    lastCheckInDate: { type: String, default: null },
    firstWorkoutCompletedAt: { type: Date, default: null },

    resetToken: { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", UserSchema);
export default User;
