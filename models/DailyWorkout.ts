import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SetSchema = new Schema(
  {
    setNumber: { type: Number, required: true },
    weight: { type: Number, default: null },
    reps: { type: Number, default: null },
    // Assisted/Bodyweight Pull-Ups only — a 3-way "how much did the machine help" selector
    // instead of a typed weight (see lib/dynamic-calorie-table.ts's ASSIST_LEVEL_CALORIE_TABLE
    // for why: its tiers run backwards from every weighted exercise's, and this exercise has
    // no numeric weight field in the quest UI at all — usesWeightTracking() in
    // lib/weight-guidance.ts). Null for every other exercise.
    assistLevel: { type: String, enum: ["heavy_assist", "light_assist", "bodyweight"], default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

const ExerciseEntrySchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    name: { type: String, required: true },
    muscleGroup: { type: String, required: true },
    targetSets: { type: Number, required: true },
    targetRepsMin: { type: Number, required: true },
    targetRepsMax: { type: Number, required: true },
    repsUnit: { type: String, enum: ["reps", "seconds"], default: "reps" },
    perSide: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["locked", "not_started", "in_progress", "complete"],
      default: "not_started",
    },
    notes: { type: String, default: "" },
    xpAwarded: { type: Boolean, default: false },
    // Forward reference to the PendingXpAward this exercise's completion queued (same pattern
    // as ExtraWorkout.xpAwardId) — lets approvals.ts find its way back here when an admin
    // approves it, to flip calorieApproved below.
    xpAwardId: { type: Schema.Types.ObjectId, ref: "PendingXpAward", default: null },
    // Calorie burn is computed live the moment this exercise is marked complete (see
    // lib/calories-burned.ts) and shown immediately everywhere else in the app — this flag
    // does NOT gate that. It only gates the Calorie Tracking page's "Logged" total, which
    // counts an exercise's burn as official only once an admin approves its XP award.
    calorieApproved: { type: Boolean, default: false },
    sets: { type: [SetSchema], default: [] },
  },
  { _id: true }
);

const DailyWorkoutSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    templateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate", default: null },
    templateName: { type: String, default: null },

    date: { type: String, required: true }, // yyyy-mm-dd, local to the user's day

    workoutName: { type: String, required: true },
    type: { type: String, enum: ["workout", "rest", "optional"], required: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "complete"],
      default: "not_started",
    },

    totalExercises: { type: Number, default: 0 },
    completedExercises: { type: Number, default: 0 },

    totalSets: { type: Number, default: 0 },
    completedSets: { type: Number, default: 0 },

    progressPercentage: { type: Number, default: 0 },

    xpEarned: { type: Number, default: 0 },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    exercises: { type: [ExerciseEntrySchema], default: [] },
  },
  { timestamps: true }
);

DailyWorkoutSchema.index({ userId: 1, date: 1 }, { unique: true });

export type DailyWorkoutDocType = InferSchemaType<typeof DailyWorkoutSchema>;

export const DailyWorkout: Model<DailyWorkoutDocType> =
  models.DailyWorkout || model<DailyWorkoutDocType>("DailyWorkout", DailyWorkoutSchema);
export default DailyWorkout;
