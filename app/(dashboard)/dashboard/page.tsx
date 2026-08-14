import type { Metadata } from "next";
import { getPlayerStatus } from "@/actions/player";
import { getTodayQuest, getTodayCalorieProgress } from "@/actions/workout";
import { getTodayAttendance } from "@/actions/attendance";
import { getWeeklyQuestStatus } from "@/actions/progress";
import { getMyParty, getPartyActivity } from "@/actions/party";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard — LevelUp" };

export default async function DashboardPage() {
  const [status, quest, attendance, weekly, party, calorieProgress] = await Promise.all([
    getPlayerStatus(),
    getTodayQuest(),
    getTodayAttendance(),
    getWeeklyQuestStatus(),
    getMyParty(),
    getTodayCalorieProgress(),
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
      calorieProgress={calorieProgress}
    />
  );
}
