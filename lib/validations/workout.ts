import { z } from "zod";

export const updateSetSchema = z.object({
  dailyWorkoutId: z.string().min(1),
  exerciseEntryId: z.string().min(1),
  setNumber: z.number().int().min(1).max(20),
  weight: z.number().min(0).max(500).nullable(),
  reps: z.number().int().min(0).max(999).nullable(),
  completed: z.boolean(),
});

export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const exerciseNotesSchema = z.object({
  dailyWorkoutId: z.string().min(1),
  exerciseEntryId: z.string().min(1),
  notes: z.string().max(500),
});

export type ExerciseNotesInput = z.infer<typeof exerciseNotesSchema>;
