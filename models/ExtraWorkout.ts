import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Extra ("overtime") work logged outside the routine. Deliberately a separate collection rather
 * than entries on DailyWorkout: appending to that document's exercises array would shift
 * totalExercises/totalSets and break the completedExercises === totalExercises quest gate, and
 * extras must also be loggable on rest days and days with no scheduled quest at all.
 */
const ExtraWorkoutSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },

    category: { type: String, enum: ["weight_training", "cardio", "abs"], required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },

    sets: { type: Number, default: null, min: 1, max: 20 },
    reps: { type: Number, default: null, min: 1, max: 999 },
    weightKg: { type: Number, default: null, min: 0, max: 500 },
    durationMin: { type: Number, default: null, min: 1, max: 300 },
    durationSec: { type: Number, default: null, min: 1, max: 3600 },
    intensity: { type: String, enum: ["light", "moderate", "intense", null], default: null },
    notes: { type: String, default: "", maxlength: 300 },

    xpAwarded: { type: Number, required: true, min: 0 },
    /** XP the entry scored before the daily cap trimmed it — shown as "capped" in the UI. */
    xpBeforeCap: { type: Number, required: true, min: 0 },
    xpAwardId: { type: Schema.Types.ObjectId, ref: "PendingXpAward", default: null },

    // Snapshotted so a past entry's XP stays explainable after the member's stats change.
    bodyWeightAtLog: { type: Number, default: null },
    heightAtLog: { type: Number, default: null },
    parWeightAtLog: { type: Number, default: null },
  },
  { timestamps: true }
);

ExtraWorkoutSchema.index({ userId: 1, date: -1 });

export type ExtraWorkoutDoc = InferSchemaType<typeof ExtraWorkoutSchema>;

export const ExtraWorkout: Model<ExtraWorkoutDoc> =
  models.ExtraWorkout || model<ExtraWorkoutDoc>("ExtraWorkout", ExtraWorkoutSchema);
export default ExtraWorkout;
