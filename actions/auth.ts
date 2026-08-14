"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PendingRegistration } from "@/models/PendingRegistration";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail, welcomeEmail, otpEmail } from "@/lib/email";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyOtpInput,
  type ResendOtpInput,
} from "@/lib/validations/auth";

const OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 1000 * 60; // 1 minute between resends

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Starts registration WITHOUT creating a User yet — the account only gets
 * created once the emailed code is verified (see verifyRegistrationOtp).
 * Re-submitting the same email before verifying just overwrites the pending
 * doc with a fresh code, so someone who fumbles or abandons the OTP step can
 * simply register again.
 */
export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectToDatabase();
  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return { success: false as const, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const otpCode = generateOtp();
  await PendingRegistration.findOneAndUpdate(
    { email: parsed.data.email },
    {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      otpCode,
      otpExpiry: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true }
  );

  // Best-effort — sendEmail() never throws, so a delivery failure never blocks registration.
  await sendEmail({ to: parsed.data.email, ...otpEmail(otpCode) });

  return { success: true as const, email: parsed.data.email };
}

/**
 * Confirms the 6-digit code emailed at registration and only now creates the
 * real User document — an unverified email never gets an account at all.
 */
export async function verifyRegistrationOtp(input: VerifyOtpInput) {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectToDatabase();
  const pending = await PendingRegistration.findOne({ email: parsed.data.email });
  if (!pending) {
    return { success: false as const, error: "This registration has expired. Please sign up again." };
  }

  if (pending.otpExpiry.getTime() < Date.now()) {
    return { success: false as const, error: "This code has expired. Request a new one." };
  }

  if (pending.otpCode !== parsed.data.code) {
    return { success: false as const, error: "That code isn't right. Double-check and try again." };
  }

  const existing = await User.findOne({ email: pending.email });
  if (existing) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return { success: false as const, error: "An account with this email already exists." };
  }

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    passwordHash: pending.passwordHash,
    isAdmin: isAdminEmail(pending.email),
  });
  await PendingRegistration.deleteOne({ _id: pending._id });

  // Best-effort — sendEmail() never throws.
  await sendEmail({ to: user.email, ...welcomeEmail(user.name) });

  return { success: true as const };
}

/**
 * Re-sends the registration code for a still-pending signup. A short cooldown
 * prevents someone from hammering send.
 */
export async function resendRegistrationOtp(input: ResendOtpInput) {
  const parsed = resendOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Enter a valid email" };
  }

  await connectToDatabase();
  const pending = await PendingRegistration.findOne({ email: parsed.data.email });
  if (!pending) {
    return { success: false as const, error: "This registration has expired. Please sign up again." };
  }

  const remainingMs = pending.otpExpiry.getTime() - Date.now();
  const sentRecently = remainingMs > OTP_TTL_MS - OTP_RESEND_COOLDOWN_MS;
  if (sentRecently) {
    return { success: false as const, error: "Please wait a moment before requesting another code." };
  }

  const otpCode = generateOtp();
  pending.otpCode = otpCode;
  pending.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  await pending.save();

  await sendEmail({ to: pending.email, ...otpEmail(otpCode) });

  return { success: true as const };
}

/**
 * In-app password reset (no email provider configured): generates a token
 * and returns the reset link directly so the UI can display it. Always
 * responds success-shaped for unknown emails to avoid leaking which
 * addresses are registered.
 */
export async function requestPasswordReset(input: ForgotPasswordInput) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Enter a valid email" };
  }

  await connectToDatabase();
  const user = await User.findOne({ email: parsed.data.email });
  if (!user) {
    return { success: true as const, resetLink: null };
  }

  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
  await user.save();

  return { success: true as const, resetLink: `/reset-password?token=${token}` };
}

export async function resetPassword(input: ResetPasswordInput) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectToDatabase();
  const user = await User.findOne({
    resetToken: parsed.data.token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    return { success: false as const, error: "This reset link is invalid or has expired." };
  }

  user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  return { success: true as const };
}
