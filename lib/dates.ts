// Date helpers. All "date keys" are local yyyy-mm-dd strings — the whole app
// reasons about "today" / "this week" in the server's local time, which is
// sufficient for a single-user gym log (no multi-timezone requirement).

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

/** Yesterday's date key — the one-day catch-up window a missed quest stays
 * completable in (see getMissedYesterdayQuest in actions/workout.ts). */
export function yesterdayKey(): string {
  return addDays(todayKey(), -1);
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayOfWeekFromKey(dateKey: string): number {
  return parseDateKey(dateKey).getDay(); // 0 = Sunday ... 6 = Saturday
}

export function addDays(dateKey: string, amount: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + amount);
  return formatDateKey(d);
}

export function isTodayOrFuture(dateKey: string): boolean {
  return dateKey >= todayKey();
}

export function isFuture(dateKey: string): boolean {
  return dateKey > todayKey();
}

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek];
}

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
export function formatDisplayDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** ISO week key like "2026-W33", used to guard the weekly-quest XP claim to once per week. */
export function isoWeekKey(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Thursday of this week decides the ISO year.
  const dayNr = (target.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const weekNumber =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/** Monday–Sunday date keys containing the given date. */
export function weekRange(dateKey: string): string[] {
  const dow = dayOfWeekFromKey(dateKey); // 0 Sun .. 6 Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(dateKey, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function durationMinutes(start: Date | string | null, end: Date | string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  return Math.round((e - s) / 60000);
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}M`;
  return `${h}H ${String(m).padStart(2, "0")}M`;
}
