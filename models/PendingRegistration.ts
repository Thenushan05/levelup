import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Holds a registration attempt until its OTP is verified — the real User
 * document is only created at that point, so an unverified email never
 * occupies an account. Re-registering the same email before verifying just
 * overwrites this doc with a fresh code (see actions/auth.ts registerUser).
 */
const PendingRegistrationSchema = new Schema(
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
    otpCode: { type: String, required: true },
    otpExpiry: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-purge abandoned signups well after their code has expired, so a
// forgotten registration doesn't squat on an email address indefinitely.
PendingRegistrationSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export type PendingRegistrationDoc = InferSchemaType<typeof PendingRegistrationSchema>;

export const PendingRegistration: Model<PendingRegistrationDoc> =
  models.PendingRegistration || model<PendingRegistrationDoc>("PendingRegistration", PendingRegistrationSchema);
export default PendingRegistration;
