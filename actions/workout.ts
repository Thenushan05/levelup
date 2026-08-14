"use server";

import { revalidatePath } from "next/cache";
import type { Types } from "mongoose";
import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { Exercise } from "@/models/Exercise";
import { requireUserDoc } from "@/lib/session";
import { todayKey, dayOfWeekFromKey, weekRange, isoWeekKey } from "@/lib/dates";
import { queueXpAward, XP_VALUES } from "@/lib/xp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { recomputeStreak } from "@/lib/streak";
import { toDailyWorkoutDTO } from "@/lib/dto";
import { notifyUserAndParty, notifyUser } from "@/lib/notify";
import { updateSetSchema, exerciseNotesSchema, type UpdateSetInput, type ExerciseNotesInput } from "@/lib/validations/workout";
import { sumCompletedExerciseCalories, sumAllExerciseCalories, type CatalogCalorieEstimate } from "@/lib/calories-burned";
import type { AchievementUnlockedDTO, DailyWorkoutDTO } from "@/types";

export interface QuestActionResult {
  workout: DailyWorkoutDTO;
  /** Not yet credited — an admin must approve it (see actions/approvals.ts) before it lands on the player's level/XP. */
  xpPending: number;
  achievementsUnlocked: AchievementUnlockedDTO[];
  weeklyQuestCompleted: boolean;
  /** Sum of each completed exercise's fixed catalog calorie range — null if
   * nothing completed yet has a figure. Climbs one exercise at a time, not
   * a weight/duration formula. */
  caloriesBurnedToday: CatalogCalorieEstimate | null;
}

/**
 * Joins each of a workout's exercises to its shared Exercise doc's fixed calorie range.
 * Shared by every action below that reports on "today's burn" so there's one place doing it.
 */
async function joinExerciseCalories(
  exercises: { exerciseId: Types.ObjectId; status: string }[]
): Promise<{ status: string; calorieBurnMin: number | null; calorieBurnMax: number | null }[]> {
  const catalogDocs = await Exercise.find({ _id: { $in: exercises.map((e) => e.exerciseId) } })
    .select("calorieBurnMin calorieBurnMax")
    .lean();
  const byId = new Map(catalogDocs.map((d) => [d._id.toString(), d]));

  return exercises.map((e) => {
    const doc = byId.get(e.exerciseId.toString());
    return {
      status: e.status,
      calorieBurnMin: doc?.calorieBurnMin ?? null,
      calorieBurnMax: doc?.calorieBurnMax ?? null,
    };
  });
}

async function calorieEstimateForWorkout(workout: {
  type: "workout" | "rest" | "optional";
  exercises: { exerciseId: Types.ObjectId; status: string }[];
}): Promise<CatalogCalorieEstimate | null> {
  if (workout.type !== "workout") return null;
  return sumCompletedExerciseCalories(await joinExerciseCalories(workout.exercises));
}

export interface DailyCalorieProgressDTO {
  /** Sum over exercises actually completed so far. */
  burned: CatalogCalorieEstimate | null;
  /** Sum over every exercise scheduled today, regardless of completion — "if I finish the
   * whole routine, this many calories total." Powers the calorie-burn gauge on the dashboard. */
  target: CatalogCalorieEstimate | null;
}

/** Today's burned-vs-target calorie progress, for the dashboard's calorie-burn gauge. No
 * body stats required — the catalog figures aren't weight-scaled. */
export async function getTodayCalorieProgress(): Promise<DailyCalorieProgressDTO> {
  const user = await requireUserDoc();
  const workout = await DailyWorkout.findOne({ userId: user._id, date: todayKey() }).lean();
  if (!workout || workout.type !== "workout") return { burned: null, target: null };

  const joined = await joinExerciseCalories(workout.exercises);
  return { burned: sumCompletedExerciseCalories(joined), target: sumAllExerciseCalories(joined) };
}

export interface TotalCalorieBurnDTO {
  totalKcal: number;
  totalWorkouts: number;
}

/**
 * Lifetime calorie burn using the same fixed-catalog per-exercise sum the
 * dashboard's today gauge uses (not the MET/duration formula the Diet page's
 * total uses) — kept consistent with the number already shown on this page.
 * Fetches the exercise catalog once for every exercise ever logged rather
 * than per-workout, so this stays a single extra query regardless of how
 * many workouts have been completed.
 */
export async function getTotalCalorieBurn(): Promise<TotalCalorieBurnDTO> {
  const user = await requireUserDoc();
  const workouts = await DailyWorkout.find({ userId: user._id, type: "workout", status: "complete" })
    .select("exercises.exerciseId exercises.status")
    .lean();

  const exerciseIds = new Set<string>();
  for (const w of workouts) {
    for (const e of w.exercises) exerciseIds.add(e.exerciseId.toString());
  }

  const catalogDocs = await Exercise.find({ _id: { $in: Array.from(exerciseIds) } })
    .select("calorieBurnMin calorieBurnMax")
    .lean();
  const byId = new Map(catalogDocs.map((d) => [d._id.toString(), d]));

  let totalKcal = 0;
  let totalWorkouts = 0;
  for (const w of workouts) {
    const joined = w.exercises.map((e) => {
      const doc = byId.get(e.exerciseId.toString());
      return { status: e.status, calorieBurnMin: doc?.calorieBurnMin ?? null, calorieBurnMax: doc?.calorieBurnMax ?? null };
    });
    const estimate = sumCompletedExerciseCalories(joined);
    if (estimate) {
      totalKcal += estimate.kcal;
      totalWorkouts += 1;
    }
  }

  return { totalKcal, totalWorkouts };
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

  await queueXpAward(user._id, XP_VALUES.WEEKLY_QUEST_COMPLETE, "weekly_quest_complete", "Weekly Quest");
  user.lastWeeklyQuestClaimedWeek = weekKey;
  user.weeklyQuestsCompletedCount += 1;
  return true;
}

/**
 * The one write path for logging a set. Idempotent XP: an exercise only
 * queues its +5 XP on the not-yet-awarded -> complete transition, and a
 * quest only queues its +50 XP once (guarded by status !== 'complete').
 * Every queued amount sits as a PendingXpAward until an admin approves it —
 * completion state (checkmarks, streaks, totals) still updates immediately.
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

  const now = new Date();

  set.weight = parsed.weight;
  set.reps = parsed.reps;
  if (parsed.completed && !set.completed) {
    set.completed = true;
    set.completedAt = now;
  } else if (!parsed.completed && set.completed) {
    set.completed = false;
    set.completedAt = null;
  }

  let xpPending = 0;
  const achievementsUnlocked: AchievementUnlockedDTO[] = [];
  let weeklyQuestCompleted = false;

  const completedSetCount = exercise.sets.filter((s) => s.completed).length;
  exercise.status =
    completedSetCount === 0 ? "not_started" : completedSetCount >= exercise.targetSets ? "complete" : "in_progress";

  if (exercise.status === "complete" && !exercise.xpAwarded) {
    exercise.xpAwarded = true;
    await queueXpAward(user._id, XP_VALUES.EXERCISE_COMPLETE, "exercise_complete", exercise.name);
    xpPending += XP_VALUES.EXERCISE_COMPLETE;
    await notifyUserAndParty(
      { id: user._id.toString(), name: user.name },
      "objective_complete",
      "party_objective_complete",
      `${user.name} completed ${exercise.name}.`,
      `+${XP_VALUES.EXERCISE_COMPLETE} XP pending approval`,
      { xp: XP_VALUES.EXERCISE_COMPLETE, pending: true }
    );
  }

  workout.completedExercises = workout.exercises.filter((e) => e.status === "complete").length;
  workout.completedSets = workout.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0
  );
  workout.progressPercentage =
    workout.totalSets > 0 ? Math.round((workout.completedSets / workout.totalSets) * 100) : 0;

  if (!workout.startedAt) workout.startedAt = now;

  if (workout.status !== "complete") {
    if (workout.totalExercises > 0 && workout.completedExercises === workout.totalExercises) {
      workout.status = "complete";
      workout.completedAt = now;
      workout.xpEarned = XP_VALUES.WORKOUT_COMPLETE;
      await queueXpAward(user._id, XP_VALUES.WORKOUT_COMPLETE, "quest_complete", workout.workoutName);
      xpPending += XP_VALUES.WORKOUT_COMPLETE;

      user.totalWorkouts += 1;
      if (!user.firstWorkoutCompletedAt) user.firstWorkoutCompletedAt = now;

      await recomputeStreak(user);

      const weeklyCompleted = await checkWeeklyQuestCompletion(user, workout.date);
      if (weeklyCompleted) {
        weeklyQuestCompleted = true;
        xpPending += XP_VALUES.WEEKLY_QUEST_COMPLETE;
      }

      const unlocked = await checkAndUnlockAchievements(user);
      achievementsUnlocked.push(...unlocked);
      xpPending += unlocked.reduce((sum, a) => sum + a.xpReward, 0);

      await notifyUserAndParty(
        { id: user._id.toString(), name: user.name },
        "quest_complete",
        "party_quest_complete",
        `${user.name} completed ${workout.workoutName}.`,
        `${workout.completedExercises}/${workout.totalExercises} objectives · +${XP_VALUES.WORKOUT_COMPLETE} XP pending approval`,
        { xp: XP_VALUES.WORKOUT_COMPLETE, workoutId: workout._id.toString(), pending: true }
      );

      if (weeklyCompleted) {
        await notifyUser(
          user._id.toString(),
          "weekly_quest_complete",
          "Weekly Quest Complete",
          `+${XP_VALUES.WEEKLY_QUEST_COMPLETE} XP pending approval`,
          { xp: XP_VALUES.WEEKLY_QUEST_COMPLETE, pending: true }
        );
      }
      for (const a of unlocked) {
        await notifyUserAndParty(
          { id: user._id.toString(), name: user.name },
          "achievement_unlocked",
          "party_achievement",
          `${user.name} unlocked ${a.title}.`,
          `${a.description} · +${a.xpReward} XP pending approval`,
          { xp: a.xpReward, key: a.key, pending: true }
        );
      }
    } else if (workout.completedExercises > 0 || workout.completedSets > 0) {
      workout.status = "in_progress";
    }
  }

  await workout.save();
  await user.save();

  revalidatePath("/dashboard");
  revalidatePath("/quest");
  revalidatePath("/diet");

  const caloriesBurnedToday = await calorieEstimateForWorkout(workout);

  return {
    workout: toDailyWorkoutDTO(workout.toObject()),
    xpPending,
    achievementsUnlocked,
    weeklyQuestCompleted,
    caloriesBurnedToday,
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
  caloriesBurnedToday: CatalogCalorieEstimate | null;
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

  const caloriesBurnedToday = await calorieEstimateForWorkout(workout);

  return { workout: dto, exercise, previousSets, previousDate, caloriesBurnedToday };
}
