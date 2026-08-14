"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail, welcomeEmail } from "@/lib/email";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

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
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    isAdmin: isAdminEmail(parsed.data.email),
  });

  // Best-effort — sendEmail() never throws, so a delivery failure never blocks registration.
  await sendEmail({ to: user.email, ...welcomeEmail(user.name) });

  return { success: true as const, userId: user._id.toString() };
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
