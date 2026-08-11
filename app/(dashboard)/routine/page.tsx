import type { Metadata } from "next";
import { getActiveRoutineDetail, getBuiltInTemplates } from "@/actions/onboarding";
import { RoutineView } from "./routine-view";
import { TemplateSwitcher } from "./template-switcher";

export const metadata: Metadata = { title: "Routine — ASCEND" };

export default async function RoutinePage() {
  const [routine, templates] = await Promise.all([getActiveRoutineDetail(), getBuiltInTemplates()]);

  return (
    <div className="space-y-8">
      <RoutineView routine={routine} />
      <TemplateSwitcher templates={templates} activeSlug={routine?.slug ?? null} />
    </div>
  );
}
