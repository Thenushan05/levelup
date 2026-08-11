"use server";

import { revalidatePath } from "next/cache";
import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserDoc } from "@/lib/session";
import { todayKey, dayOfWeekFromKey, weekRange, isoWeekKey } from "@/lib/dates";
import { applyXp, snapshotLevel, diffLevel, XP_VALUES } from "@/lib/xp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { recomputeStreak } from "@/lib/streak";
import { toDailyWorkoutDTO } from "@/lib/dto";
import { notifyUserAndParty, notifyUser } from "@/lib/notify";
import { updateSetSchema, exerciseNotesSchema, type UpdateSetInput, type ExerciseNotesInput } from "@/lib/validations/workout";
import type { AchievementUnlockedDTO, DailyWorkoutDTO, LevelUpResult } from "@/types";

export interface QuestActionResult {
  workout: DailyWorkoutDTO;
  xpAwarded: number;
  levelUp: LevelUpResult;
  achievementsUnlocked: AchievementUnlockedDTO[];
  weeklyQuestCompleted: boolean;
}

/** Resolves (creating if needed) today's DailyWorkout from the user's active template. */
export async function getTodayQuest(): Promise<DailyWorkoutDTO | null> {
  const user = await requireUserDoc();
  if (!user.activeTemplateId) return null;

  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return null;

  const date = todayKey();
  const existing = await DailyWorkout.findOne({ userId: user._id, date }).lean();
  if (existing) return toDailyWorkoutDTO(existing);

  const entry = template.schedule.find((d) => d.dayOfWeek === dayOfWeekFromKey(date));
  if (!entry) return null;

  const exercises = entry.exercises.map((ex) => ({
    exerciseId: ex.exerciseId,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    targetSets: ex.targetSets,
    targetRepsMin: ex.targetRepsMin,
    targetRepsMax: ex.targetRepsMax,
    repsUnit: ex.repsUnit ?? "reps",
    perSide: ex.perSide ?? false,
    status: "not_started" as const,
    notes: "",
    xpAwarded: false,
    sets: Array.from({ length: ex.targetSets }, (_, i) => ({
      setNumber: i + 1,
      weight: null,
      reps: null,
      completed: false,
      completedAt: null,
    })),
  }));

  const totalSets = exercises.reduce((sum, e) => sum + e.targetSets, 0);

  try {
    const created = await DailyWorkout.create({
      userId: user._id,
      templateId: template._id,
      templateName: template.name,
      date,
      workoutName: entry.label,
      type: entry.type,
      status: "not_started",
      totalExercises: exercises.length,
      completedExercises: 0,
      totalSets,
      completedSets: 0,
      progressPercentage: 0,
      xpEarned: 0,
      exercises,
    });
    return toDailyWorkoutDTO(created.toObject());
  } catch {
    // Unique-index race: another request created it first — just fetch it.
    const raced = await DailyWorkout.findOne({ userId: user._id, date }).lean();
    return raced ? toDailyWorkoutDTO(raced) : null;
  }
}

export async function startQuest(dailyWorkoutId: string): Promise<DailyWorkoutDTO | null> {
  const user = await requireUserDoc();
  const workout = await DailyWorkout.findOne({ _id: dailyWorkoutId, userId: user._id });
  if (!workout) return null;

  if (!workout.startedAt) workout.startedAt = new Date();
  if (workout.status === "not_started" && workout.type === "workout") {
    workout.status = "in_progress";
  }
  await workout.save();
  return toDailyWorkoutDTO(workout.toObject());
}

async function checkWeeklyQuestCompletion(
  user: Awaited<ReturnType<typeof requireUserDoc>>,
  dateKey: string
): Promise<boolean> {
  if (!user.activeTemplateId) return false;
  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return false;

  const week = weekRange(dateKey);
  const requiredDates = week.filter((d) => {
    const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(d));
    return entry?.type === "workout";
  });
  if (requiredDates.length === 0) return false;

  const weekKey = isoWeekKey(dateKey);
  if (user.lastWeeklyQuestClaimedWeek === weekKey) return false;

  const completedCount = await DailyWorkout.countDocuments({
    userId: user._id,
    date: { $in: requiredDates },
    status: "complete",
  });

  if (completedCount < requiredDates.length) return false;

  applyXp(user, XP_VALUES.WEEKLY_QUEST_COMPLETE);
  user.lastWeeklyQuestClaimedWeek = weekKey;
  user.weeklyQuestsCompletedCount += 1;
  return true;
}

/**
 * The one write path for logging a set. Idempotent XP: an exercise only
 * awards its +5 XP on the not-yet-awarded -> complete transition, and a
 * quest only awards its +50 XP once (guarded by status !== 'complete').
 */
export async function updateSet(input: UpdateSetInput): Promise<QuestActionResult> {
  const parsed = updateSetSchema.parse(input);
  const user = await requireUserDoc();

  const workout = await DailyWorkout.findOne({ _id: parsed.dailyWorkoutId, userId: user._id });
  if (!workout) throw new Error("Quest not found.");
  if (workout.type !== "workout") throw new Error("This day has no objectives to log.");

  const exercise = workout.exercises.id(parsed.exerciseEntryId);
  if (!exercise) throw new Error("Objective not found.");

  let set = exercise.sets.find((s) => s.setNumber === parsed.setNumber);
  if (!set) {
    exercise.sets.push({ setNumber: parsed.setNumber, weight: null, reps: null, completed: false, completedAt: null });
    set = exercise.sets[exercise.sets.length - 1];
  }

  set.weight = parsed.weight;
  set.reps = parsed.reps;
  if (parsed.completed && !set.completed) {
    set.completed = true;
    set.completedAt = new Date();
  } else if (!parsed.completed && set.completed) {
    set.completed = false;
    set.completedAt = null;
  }

  const before = snapshotLevel(user);
  let xpThisCall = 0;
  const achievementsUnlocked: AchievementUnlockedDTO[] = [];
  let weeklyQuestCompleted = false;

  const completedSetCount = exercise.sets.filter((s) => s.completed).length;
  exercise.status =
    completedSetCount === 0 ? "not_started" : completedSetCount >= exercise.targetSets ? "complete" : "in_progress";

  if (exercise.status === "complete" && !exercise.xpAwarded) {
    exercise.xpAwarded = true;
    applyXp(user, XP_VALUES.EXERCISE_COMPLETE);
    xpThisCall += XP_VALUES.EXERCISE_COMPLETE;
    await notifyUser(user._id.toString(), "objective_complete", "Objective Complete", exercise.name, {
      xp: XP_VALUES.EXERCISE_COMPLETE,
    });
  }

  workout.completedExercises = workout.exercises.filter((e) => e.status === "complete").length;
  workout.completedSets = workout.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0
  );
  workout.progressPercentage =
    workout.totalSets > 0 ? Math.round((workout.completedSets / workout.totalSets) * 100) : 0;

  if (!workout.startedAt) workout.startedAt = new Date();

  if (workout.status !== "complete") {
    if (workout.totalExercises > 0 && workout.completedExercises === workout.totalExercises) {
      workout.status = "complete";
      workout.completedAt = new Date();
      workout.xpEarned = XP_VALUES.WORKOUT_COMPLETE;
      applyXp(user, XP_VALUES.WORKOUT_COMPLETE);
      xpThisCall += XP_VALUES.WORKOUT_COMPLETE;

      user.totalWorkouts += 1;
      if (!user.firstWorkoutCompletedAt) user.firstWorkoutCompletedAt = new Date();

      await recomputeStreak(user);

      const weeklyCompleted = await checkWeeklyQuestCompletion(user, workout.date);
      if (weeklyCompleted) {
        weeklyQuestCompleted = true;
        xpThisCall += XP_VALUES.WEEKLY_QUEST_COMPLETE;
      }

      const unlocked = await checkAndUnlockAchievements(user);
      achievementsUnlocked.push(...unlocked);
      xpThisCall += unlocked.reduce((sum, a) => sum + a.xpReward, 0);

      await notifyUserAndParty(
        { id: user._id.toString(), name: user.name },
        "quest_complete",
        "party_quest_complete",
        `${user.name} completed ${workout.workoutName}.`,
        `${workout.completedExercises}/${workout.totalExercises} objectives`,
        { xp: XP_VALUES.WORKOUT_COMPLETE, workoutId: workout._id.toString() }
      );

      if (weeklyCompleted) {
        await notifyUser(user._id.toString(), "weekly_quest_complete", "Weekly Quest Complete", "", {
          xp: XP_VALUES.WEEKLY_QUEST_COMPLETE,
        });
      }
      for (const a of unlocked) {
        await notifyUserAndParty(
          { id: user._id.toString(), name: user.name },
          "achievement_unlocked",
          "party_achievement",
          `${user.name} unlocked ${a.title}.`,
          a.description,
          { xp: a.xpReward, key: a.key }
        );
      }
    } else if (workout.completedExercises > 0 || workout.completedSets > 0) {
      workout.status = "in_progress";
    }
  }

  const levelUp = diffLevel(before, user);
  if (levelUp.leveledUp) {
    await notifyUserAndParty(
      { id: user._id.toString(), name: user.name },
      "level_up",
      "party_level_up",
      `${user.name} reached Level ${levelUp.toLevel}.`,
      levelUp.rankChanged ? `Rank up: ${levelUp.toRank} Rank` : "",
      { fromLevel: levelUp.fromLevel, toLevel: levelUp.toLevel }
    );
  }

  await workout.save();
  await user.save();

  revalidatePath("/dashboard");
  revalidatePath("/quest");

  return {
    workout: toDailyWorkoutDTO(workout.toObject()),
    xpAwarded: xpThisCall,
    levelUp,
    achievementsUnlocked,
    weeklyQuestCompleted,
  };
}

export async function updateExerciseNotes(input: ExerciseNotesInput): Promise<DailyWorkoutDTO> {
  const parsed = exerciseNotesSchema.parse(input);
  const user = await requireUserDoc();

  const workout = await DailyWorkout.findOne({ _id: parsed.dailyWorkoutId, userId: user._id });
  if (!workout) throw new Error("Quest not found.");
  const exercise = workout.exercises.id(parsed.exerciseEntryId);
  if (!exercise) throw new Error("Objective not found.");

  exercise.notes = parsed.notes;
  await workout.save();

  return toDailyWorkoutDTO(workout.toObject());
}

/** Rest / optional days: acknowledges the day without awarding XP. Streak logic already treats these as auto-compliant regardless. */
export async function completeRecoveryDay(dailyWorkoutId: string): Promise<DailyWorkoutDTO> {
  const user = await requireUserDoc();
  const workout = await DailyWorkout.findOne({ _id: dailyWorkoutId, userId: user._id });
  if (!workout) throw new Error("Day not found.");
  if (workout.type === "workout") throw new Error("This is a training day, not a recovery day.");

  workout.status = "complete";
  if (!workout.startedAt) workout.startedAt = new Date();
  workout.completedAt = new Date();
  await workout.save();

  revalidatePath("/dashboard");
  return toDailyWorkoutDTO(workout.toObject());
}

export interface ExerciseDetailDTO {
  workout: DailyWorkoutDTO;
  exercise: DailyWorkoutDTO["exercises"][number];
  previousSets: { setNumber: number; weight: number | null; reps: number | null }[];
  previousDate: string | null;
}

export async function getExerciseDetail(
  dailyWorkoutId: string,
  exerciseEntryId: string
): Promise<ExerciseDetailDTO | null> {
  const user = await requireUserDoc();
  const workout = await DailyWorkout.findOne({ _id: dailyWorkoutId, userId: user._id }).lean();
  if (!workout) return null;

  const rawEntry = workout.exercises.find((e) => String((e as { _id: unknown })._id) === exerciseEntryId);
  if (!rawEntry) return null;

  const prevWorkout = await DailyWorkout.findOne({
    userId: user._id,
    date: { $lt: workout.date },
    "exercises.exerciseId": rawEntry.exerciseId,
  })
    .sort({ date: -1 })
    .lean();

  let previousSets: { setNumber: number; weight: number | null; reps: number | null }[] = [];
  let previousDate: string | null = null;
  if (prevWorkout) {
    const prevEntry = prevWorkout.exercises.find(
      (e) => e.exerciseId.toString() === rawEntry.exerciseId.toString()
    );
    if (prevEntry) {
      previousSets = prevEntry.sets
        .filter((s) => s.completed)
        .map((s) => ({ setNumber: s.setNumber, weight: s.weight ?? null, reps: s.reps ?? null }));
      previousDate = prevWorkout.date;
    }
  }

  const dto = toDailyWorkoutDTO(workout);
  const exercise = dto.exercises.find((e) => e.id === exerciseEntryId)!;

  return { workout: dto, exercise, previousSets, previousDate };
}
