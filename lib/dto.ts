import { requiredXpForLevel } from "@/lib/xp";
import { durationMinutes } from "@/lib/dates";
import type { UserDoc } from "@/models/User";
import type { DailyWorkoutDocType } from "@/models/DailyWorkout";
import type { HydratedDocument } from "mongoose";
import type { DailyWorkoutDTO, ExerciseEntryDTO, PlayerSummaryDTO, SetDTO } from "@/types";

export function toPlayerSummary(user: HydratedDocument<UserDoc>): PlayerSummaryDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    level: user.level,
    xp: user.xp,
    requiredXp: requiredXpForLevel(user.level),
    rank: user.rank as PlayerSummaryDTO["rank"],
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalWorkouts: user.totalWorkouts,
    onboardingCompleted: user.onboardingCompleted,
  };
}

type LeanDailyWorkout = DailyWorkoutDocType & { _id: unknown };

export function toDailyWorkoutDTO(doc: LeanDailyWorkout): DailyWorkoutDTO {
  const exercises: ExerciseEntryDTO[] = doc.exercises.map((ex) => {
    const sets: SetDTO[] = ex.sets.map((s) => ({
      id: (s as unknown as { _id: { toString(): string } })._id.toString(),
      setNumber: s.setNumber,
      weight: s.weight ?? null,
      reps: s.reps ?? null,
      completed: s.completed,
      completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    }));
    return {
      id: (ex as unknown as { _id: { toString(): string } })._id.toString(),
      exerciseId: ex.exerciseId.toString(),
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      targetSets: ex.targetSets,
      targetRepsMin: ex.targetRepsMin,
      targetRepsMax: ex.targetRepsMax,
      repsUnit: (ex.repsUnit as "reps" | "seconds") ?? "reps",
      perSide: ex.perSide ?? false,
      status: ex.status as ExerciseEntryDTO["status"],
      notes: ex.notes ?? "",
      sets,
    };
  });

  return {
    id: doc._id ? String(doc._id) : "",
    templateId: doc.templateId ? doc.templateId.toString() : null,
    templateName: doc.templateName ?? null,
    date: doc.date,
    workoutName: doc.workoutName,
    type: doc.type as DailyWorkoutDTO["type"],
    status: doc.status as DailyWorkoutDTO["status"],
    totalExercises: doc.totalExercises,
    completedExercises: doc.completedExercises,
    totalSets: doc.totalSets,
    completedSets: doc.completedSets,
    progressPercentage: doc.progressPercentage,
    xpEarned: doc.xpEarned,
    startedAt: doc.startedAt ? new Date(doc.startedAt).toISOString() : null,
    completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString() : null,
    durationMinutes: durationMinutes(doc.startedAt ?? null, doc.completedAt ?? null),
    exercises,
  };
}
