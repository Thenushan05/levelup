import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getBuiltInTemplates } from "@/actions/onboarding";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding — LevelUp" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id).select("onboardingCompleted name").lean();
  if (user?.onboardingCompleted) redirect("/dashboard");

  const templates = await getBuiltInTemplates();

  return <OnboardingWizard playerName={user?.name ?? "Player"} templates={templates} />;
}
