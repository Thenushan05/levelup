import type { Metadata } from "next";
import { getTodayQuest, getMissedYesterdayQuest } from "@/actions/workout";
import { getTodayExtraWorkouts } from "@/actions/extra-workout";
import { QuestChecklist } from "./quest-checklist";

export const metadata: Metadata = { title: "Daily Quest — LevelUp" };

export default async function QuestPage() {
  const [quest, extras, missedYesterday] = await Promise.all([
    getTodayQuest(),
    getTodayExtraWorkouts(),
    getMissedYesterdayQuest(),
  ]);
  return <QuestChecklist initial={quest} extras={extras} missedYesterday={missedYesterday} />;
}
