"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { ensureSeeded } from "@/lib/seed";
import { Exercise } from "@/models/Exercise";
import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserId, requireUserDoc } from "@/lib/session";
import { addDays, dayOfWeekFromKey, isoWeekKey, todayKey, weekRange } from "@/lib/dates";

export interface ExerciseLibraryItemDTO {
  slug: string;
  name: string;
  muscleGroup: string;
  imageUrl: string | null;
}

export async function getExerciseLibrary(): Promise<ExerciseLibraryItemDTO[]> {
  await requireUserId();
  await connectToDatabase();
  await ensureSeeded();

  const exercises = await Exercise.find({}).sort({ muscleGroup: 1, name: 1 }).lean();
  return exercises.map((e) => ({
    slug: e.slug,
    name: e.name,
    muscleGroup: e.muscleGroup,
    imageUrl: e.imageUrl ?? null,
  }));
}

export interface ExerciseProgressDTO {
  slug: string;
  name: string;
  muscleGroup: string;
  sessions: number;
  bestWeight: number | null;
  lastSession: { date: string; weight: number | null; reps: number | null } | null;
  history: { date: string; weight: number; reps: number }[];
}

export async function getExerciseProgress(slug: string): Promise<ExerciseProgressDTO | null> {
  const user = await requireUserDoc();
  const exercise = await Exercise.findOne({ slug }).lean();
  if (!exercise) return null;

  const workouts = await DailyWorkout.find({
    userId: user._id,
    "exercises.exerciseId": exercise._id,
  })
    .sort({ date: 1 })
    .lean();

  const history: { date: string; weight: number; reps: number }[] = [];
  let bestWeight = 0;
  let lastSession: ExerciseProgressDTO["lastSession"] = null;

  for (const w of workouts) {
    const entry = w.exercises.find((e) => e.exerciseId.toString() === exercise._id.toString());
    if (!entry) continue;
    const completedSets = entry.sets.filter((s) => s.completed && s.weight != null);
    if (completedSets.length === 0) continue;

    const topSet = completedSets.reduce(
      (best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best),
      completedSets[0]
    );
    history.push({ date: w.date, weight: topSet.weight ?? 0, reps: topSet.reps ?? 0 });
    if ((topSet.weight ?? 0) > bestWeight) bestWeight = topSet.weight ?? 0;
    lastSession = { date: w.date, weight: topSet.weight ?? null, reps: topSet.reps ?? null };
  }

  return {
    slug: exercise.slug,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sessions: history.length,
    bestWeight: history.length > 0 ? bestWeight : null,
    lastSession,
    history,
  };
}

export interface WeeklyQuestDayDTO {
  date: string;
  dayOfWeek: number;
  label: string;
  type: "workout" | "rest" | "optional";
  status: "complete" | "pending" | "missed" | "future" | "na";
}

export interface WeeklyQuestStatusDTO {
  days: WeeklyQuestDayDTO[];
  requiredCount: number;
  completedCount: number;
  claimed: boolean;
}

export async function getWeeklyQuestStatus(): Promise<WeeklyQuestStatusDTO | null> {
  const user = await requireUserDoc();
  if (!user.activeTemplateId) return null;
  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return null;

  const today = todayKey();
  const week = weekRange(today);
  const workouts = await DailyWorkout.find({ userId: user._id, date: { $in: week } })
    .select("date status type")
    .lean();
  const byDate = new Map(workouts.map((w) => [w.date, w]));

  const days: WeeklyQuestDayDTO[] = week.map((date) => {
    const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(date));
    const type = (entry?.type ?? "rest") as "workout" | "rest" | "optional";
    const record = byDate.get(date);

    let status: WeeklyQuestDayDTO["status"];
    if (type !== "workout") status = "na";
    else if (record?.status === "complete") status = "complete";
    else if (date > today) status = "future";
    else if (date === today) status = "pending";
    else status = "missed";

    return { date, dayOfWeek: dayOfWeekFromKey(date), label: entry?.label ?? "", type, status };
  });

  const requiredCount = days.filter((d) => d.type === "workout").length;
  const completedCount = days.filter((d) => d.type === "workout" && d.status === "complete").length;
  const claimed = user.lastWeeklyQuestClaimedWeek === isoWeekKey(today);

  return { days, requiredCount, completedCount, claimed };
}

export interface WeeklyCompletionPointDTO {
  weekKey: string;
  weekStart: string;
  required: number;
  completed: number;
}

export async function getWeeklyCompletionHistory(weeksCount = 8): Promise<WeeklyCompletionPointDTO[]> {
  const user = await requireUserDoc();
  if (!user.activeTemplateId) return [];
  const template = await WorkoutTemplate.findById(user.activeTemplateId).lean();
  if (!template) return [];

  const today = todayKey();
  const result: WeeklyCompletionPointDTO[] = [];

  for (let i = weeksCount - 1; i >= 0; i--) {
    const anchor = addDays(today, -7 * i);
    const week = weekRange(anchor);
    const requiredDates = week.filter((d) => {
      const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(d));
      return entry?.type === "workout";
    });
    const completed = await DailyWorkout.countDocuments({
      userId: user._id,
      date: { $in: requiredDates },
      status: "complete",
    });
    result.push({
      weekKey: isoWeekKey(anchor),
      weekStart: week[0],
      required: requiredDates.length,
      completed,
    });
  }

  return result;
}
