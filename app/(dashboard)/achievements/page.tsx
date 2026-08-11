import type { Metadata } from "next";
import { getAchievements } from "@/actions/achievements";
import { AchievementsView } from "./achievements-view";

export const metadata: Metadata = { title: "Achievements — ASCEND" };

export default async function AchievementsPage() {
  const data = await getAchievements();
  return <AchievementsView data={data} />;
}
