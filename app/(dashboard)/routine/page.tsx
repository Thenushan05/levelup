import type { Metadata } from "next";
import { getActiveRoutineDetail } from "@/actions/onboarding";
import { RoutineView } from "./routine-view";

export const metadata: Metadata = { title: "Routine — ASCEND" };

export default async function RoutinePage() {
  const routine = await getActiveRoutineDetail();
  return <RoutineView routine={routine} />;
}
