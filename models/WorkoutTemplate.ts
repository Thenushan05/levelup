import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const TemplateExerciseSchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    name: { type: String, required: true },
    muscleGroup: { type: String, required: true },
    targetSets: { type: Number, required: true },
    targetRepsMin: { type: Number, required: true },
    targetRepsMax: { type: Number, required: true },
    repsUnit: { type: String, enum: ["reps", "seconds"], default: "reps" },
    perSide: { type: Boolean, default: false },
  },
  { _id: false }
);

const ScheduleDaySchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    label: { type: String, required: true },
    type: { type: String, enum: ["workout", "rest", "optional"], required: true },
    exercises: { type: [TemplateExerciseSchema], default: [] },
  },
  { _id: false }
);

const WorkoutTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    daysPerWeek: { type: Number, required: true },
    isBuiltIn: { type: Boolean, default: true },
    schedule: { type: [ScheduleDaySchema], default: [] },
  },
  { timestamps: true }
);

export type WorkoutTemplateDoc = InferSchemaType<typeof WorkoutTemplateSchema>;

export const WorkoutTemplate: Model<WorkoutTemplateDoc> =
  models.WorkoutTemplate || model<WorkoutTemplateDoc>("WorkoutTemplate", WorkoutTemplateSchema);
export default WorkoutTemplate;
