import type { Metadata } from "next";
import { getWeeklyCompletionHistory } from "@/actions/progress";
import { getCalendarMonth } from "@/actions/history";
import { getPlayerStatus } from "@/actions/player";
import { ProgressView } from "./progress-view";

export const metadata: Metadata = { title: "Progress — ASCEND" };

export default async function ProgressPage() {
  const now = new Date();
  const [weekly, calendar, status] = await Promise.all([
    getWeeklyCompletionHistory(8),
    getCalendarMonth(now.getFullYear(), now.getMonth() + 1),
    getPlayerStatus(),
  ]);

  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return <ProgressView weekly={weekly} calendar={calendar} monthLabel={monthLabel} stats={status.stats} />;
}
