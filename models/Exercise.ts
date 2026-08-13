import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ExerciseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    muscleGroup: { type: String, required: true },
    defaultSets: { type: Number, default: 3 },
    defaultRepsMin: { type: Number, default: 8 },
    defaultRepsMax: { type: Number, default: 12 },
    equipment: { type: String, default: null },
    imageUrl: { type: String, default: null },
    // Suggested weight per body-weight band, aligned by index to BODYWEIGHT_BANDS in
    // lib/weight-guidance.ts (e.g. ["5–7 kg", "6–8 kg", ...]). Empty for bodyweight-only moves.
    weightGuidance: { type: [String], default: [] },
    isBuiltIn: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ExerciseDoc = InferSchemaType<typeof ExerciseSchema>;

export const Exercise: Model<ExerciseDoc> =
  models.Exercise || model<ExerciseDoc>("Exercise", ExerciseSchema);
export default Exercise;
