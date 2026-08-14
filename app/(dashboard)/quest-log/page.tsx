import type { Metadata } from "next";
import { getQuestLog } from "@/actions/history";
import { QuestLogView } from "./quest-log-view";

export const metadata: Metadata = { title: "Quest Log — LevelUp" };

export default async function QuestLogPage() {
  const entries = await getQuestLog(30);
  return <QuestLogView entries={entries} />;
}
