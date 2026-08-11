import { z } from "zod";
import { bodyStatsSchema } from "@/lib/validations/onboarding";

export const updateBodyStatsSchema = bodyStatsSchema;
export type UpdateBodyStatsInput = z.infer<typeof updateBodyStatsSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  image: z.union([z.string().trim().url("Enter a valid image URL"), z.literal("")]),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
