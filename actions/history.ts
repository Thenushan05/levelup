"use server";

import { DailyWorkout } from "@/models/DailyWorkout";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { requireUserDoc } from "@/lib/session";
import { toDailyWorkoutDTO } from "@/lib/dto";
import { dayOfWeekFromKey, todayKey } from "@/lib/dates";
import type { DailyWorkoutDTO } from "@/types";

export interface QuestLogEntryDTO {
  id: string;
  date: string;
  workoutName: string;
  type: DailyWorkoutDTO["type"];
  status: DailyWorkoutDTO["status"];
  completedExercises: number;
  totalExercises: number;
  completedSets: number;
  totalSets: number;
  durationMinutes: number | null;
  xpEarned: number;
}

export async function getQuestLog(limit = 30): Promise<QuestLogEntryDTO[]> {
  const user = await requireUserDoc();
  const docs = await DailyWorkout.find({ userId: user._id, date: { $lte: todayKey() } })
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  return docs.map((d) => {
    const dto = toDailyWorkoutDTO(d);
    return {
      id: dto.id,
      date: dto.date,
      workoutName: dto.workoutName,
      type: dto.type,
      status: dto.status,
      completedExercises: dto.completedExercises,
      totalExercises: dto.totalExercises,
      completedSets: dto.completedSets,
      totalSets: dto.totalSets,
      durationMinutes: dto.durationMinutes,
      xpEarned: dto.xpEarned,
    };
  });
}

export async function getWorkoutDetail(id: string): Promise<DailyWorkoutDTO | null> {
  const user = await requireUserDoc();
  const doc = await DailyWorkout.findOne({ _id: id, userId: user._id }).lean();
  return doc ? toDailyWorkoutDTO(doc) : null;
}

export type CalendarDayStatus =
  | "complete"
  | "in_progress"
  | "missed"
  | "recovery"
  | "optional"
  | "pending"
  | "future"
  | "no_plan";

export interface CalendarDayDTO {
  date: string;
  status: CalendarDayStatus;
  workoutName: string | null;
}

/** month is 1-indexed (1 = January). Never marks a future date as missed. */
export async function getCalendarMonth(year: number, month: number): Promise<CalendarDayDTO[]> {
  const user = await requireUserDoc();
  const template = user.activeTemplateId
    ? await WorkoutTemplate.findById(user.activeTemplateId).lean()
    : null;
  const today = todayKey();

  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-${pad(daysInMonth)}`;

  const workouts = await DailyWorkout.find({ userId: user._id, date: { $gte: start, $lte: end } })
    .select("date status type workoutName")
    .lean();
  const byDate = new Map(workouts.map((w) => [w.date, w]));

  const days: CalendarDayDTO[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${pad(month)}-${pad(d)}`;

    if (dateKey > today) {
      days.push({ date: dateKey, status: "future", workoutName: null });
      continue;
    }

    const record = byDate.get(dateKey);
    if (record) {
      let status: CalendarDayStatus;
      if (record.type === "optional") status = "optional";
      else if (record.type === "rest") status = "recovery";
      else status = record.status === "complete" ? "complete" : dateKey === today ? "pending" : "missed";
      days.push({ date: dateKey, status, workoutName: record.workoutName });
      continue;
    }

    if (!template) {
      days.push({ date: dateKey, status: "no_plan", workoutName: null });
      continue;
    }
    const entry = template.schedule.find((s) => s.dayOfWeek === dayOfWeekFromKey(dateKey));
    if (!entry) {
      days.push({ date: dateKey, status: "no_plan", workoutName: null });
    } else if (entry.type === "rest") {
      days.push({ date: dateKey, status: "recovery", workoutName: entry.label });
    } else if (entry.type === "optional") {
      days.push({ date: dateKey, status: "optional", workoutName: entry.label });
    } else {
      days.push({
        date: dateKey,
        status: dateKey === today ? "pending" : "missed",
        workoutName: entry.label,
      });
    }
  }

  return days;
}
