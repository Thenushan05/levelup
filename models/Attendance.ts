import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // yyyy-mm-dd
    checkedInAt: { type: Date, required: true },
    xpAwarded: { type: Number, default: 10 },
  },
  { timestamps: true }
);

AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export type AttendanceDoc = InferSchemaType<typeof AttendanceSchema>;

export const Attendance: Model<AttendanceDoc> =
  models.Attendance || model<AttendanceDoc>("Attendance", AttendanceSchema);
export default Attendance;
