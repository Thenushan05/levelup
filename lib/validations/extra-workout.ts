import { z } from "zod";

/**
 * Discriminated on category so the shape itself prevents nonsense like a weight on a cardio
 * session — the same class of mistake the routine's set row used to allow.
 */
const baseFields = {
  name: z.string().trim().min(2).max(60),
  notes: z.string().max(300).optional().default(""),
};

export const logExtraWorkoutSchema = z.discriminatedUnion("category", [
  z.object({
    ...baseFields,
    category: z.literal("weight_training"),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(1).max(999),
    weightKg: z.number().min(0).max(500).nullable(),
  }),
  z.object({
    ...baseFields,
    category: z.literal("cardio"),
    durationMin: z.number().int().min(1).max(300),
    intensity: z.enum(["light", "moderate", "intense"]),
  }),
  z.object({
    ...baseFields,
    category: z.literal("abs"),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(1).max(999).nullable(),
    durationSec: z.number().int().min(1).max(3600).nullable(),
    weightKg: z.number().min(0).max(500).nullable(),
  }),
]);

export type LogExtraWorkoutInput = z.infer<typeof logExtraWorkoutSchema>;
