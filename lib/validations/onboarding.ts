import { z } from "zod";

export const onboardingSchema = z.object({
  experience: z.enum(["beginner", "intermediate", "experienced"]),
  daysPerWeek: z.number().int().min(1).max(7),
  templateSlug: z.string().min(1),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
