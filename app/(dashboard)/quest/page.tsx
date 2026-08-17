import type { Metadata } from "next";
import { getTodayQuest } from "@/actions/workout";
import { getTodayExtraWorkouts } from "@/actions/extra-workout";
import { QuestChecklist } from "./quest-checklist";

export const metadata: Metadata = { title: "Daily Quest — LevelUp" };

export default async function QuestPage() {
  const [quest, extras] = await Promise.all([getTodayQuest(), getTodayExtraWorkouts()]);
  return <QuestChecklist initial={quest} extras={extras} />;
}
