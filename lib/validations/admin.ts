import { z } from "zod";

const templateExerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(60),
  muscleGroup: z.string().trim().min(1, "Muscle group is required").max(40),
  targetSets: z.number().int().min(1).max(10),
  targetRepsMin: z.number().int().min(1).max(999),
  targetRepsMax: z.number().int().min(1).max(999),
  repsUnit: z.enum(["reps", "seconds"]),
  perSide: z.boolean(),
  imageUrl: z.string().trim().max(300).optional(),
});

const templateDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    type: z.enum(["workout", "rest", "optional"]),
    label: z.string().trim().max(60),
    exercises: z.array(templateExerciseSchema).max(15),
  })
  .refine((day) => day.type !== "workout" || day.exercises.length > 0, {
    message: "Every training day needs at least one exercise.",
    path: ["exercises"],
  });

export const templateFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().trim().max(300),
  schedule: z.array(templateDaySchema).length(7, "Schedule must define all 7 days"),
});

export type TemplateFormInput = z.infer<typeof templateFormSchema>;
