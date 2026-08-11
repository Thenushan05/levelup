import type { Metadata } from "next";
import { getTodayQuest } from "@/actions/workout";
import { QuestChecklist } from "./quest-checklist";

export const metadata: Metadata = { title: "Daily Quest — ASCEND" };

export default async function QuestPage() {
  const quest = await getTodayQuest();
  return <QuestChecklist initial={quest} />;
}
