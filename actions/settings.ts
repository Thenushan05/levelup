"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUserDoc } from "@/lib/session";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "@/lib/validations/settings";
import { toPlayerSummary } from "@/lib/dto";

export async function updateProfile(input: UpdateProfileInput) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();
  user.name = parsed.data.name;
  user.image = parsed.data.image || null;
  await user.save();

  revalidatePath("/player");
  revalidatePath("/settings");
  return { success: true as const, player: toPlayerSummary(user) };
}

export async function changePassword(input: ChangePasswordInput) {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUserDoc();
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false as const, error: "Current password is incorrect." };
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await user.save();

  return { success: true as const };
}
