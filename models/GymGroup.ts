import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const GymGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    inviteCode: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [MemberSchema], default: [] },
  },
  { timestamps: true }
);

export type GymGroupDoc = InferSchemaType<typeof GymGroupSchema>;

export const GymGroup: Model<GymGroupDoc> =
  models.GymGroup || model<GymGroupDoc>("GymGroup", GymGroupSchema);
export default GymGroup;
