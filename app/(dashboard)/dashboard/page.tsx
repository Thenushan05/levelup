import type { Metadata } from "next";
import { getPlayerStatus } from "@/actions/player";
import { getTodayQuest, getTodayCaloriesBurned } from "@/actions/workout";
import { getTodayAttendance } from "@/actions/attendance";
import { getWeeklyQuestStatus } from "@/actions/progress";
import { getMyParty, getPartyActivity } from "@/actions/party";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard — ASCEND" };

export default async function DashboardPage() {
  const [status, quest, attendance, weekly, party, caloriesBurnedToday] = await Promise.all([
    getPlayerStatus(),
    getTodayQuest(),
    getTodayAttendance(),
    getWeeklyQuestStatus(),
    getMyParty(),
    getTodayCaloriesBurned(),
  ]);

  const activity = party ? await getPartyActivity(party.id, 5) : [];

  return (
    <DashboardClient
      status={status}
      quest={quest}
      attendance={attendance}
      weekly={weekly}
      party={party}
      activity={activity}
      caloriesBurnedToday={caloriesBurnedToday}
    />
  );
}
