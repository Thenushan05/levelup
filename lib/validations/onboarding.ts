import { z } from "zod";

/** Shared with Settings (see lib/validations/settings.ts) so existing users
 * can fill this in later without a second, drifted copy of the same rules. */
export const bodyStatsSchema = z.object({
  weightKg: z.number({ message: "Enter your weight" }).min(20, "Enter a realistic weight").max(400),
  heightCm: z.number({ message: "Enter your height" }).min(100, "Enter a realistic height").max(250),
  age: z.number({ message: "Enter your age" }).int().min(13, "Must be 13 or older").max(100),
  biologicalSex: z.enum(["male", "female", "unspecified"]),
  fitnessGoal: z.enum(["lose_weight", "maintain", "gain_muscle"]),
  unitSystem: z.enum(["metric", "imperial"]),
});

export type BodyStatsInput = z.infer<typeof bodyStatsSchema>;

export const onboardingSchema = z
  .object({
    experience: z.enum(["beginner", "intermediate", "experienced"]),
    daysPerWeek: z.number().int().min(1).max(7),
    templateSlug: z.string().min(1),
  })
  .and(bodyStatsSchema);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
