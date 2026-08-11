import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings — ASCEND" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id)
    .select("name email image weightKg heightCm age biologicalSex fitnessGoal unitSystem")
    .lean();

  return (
    <SettingsView
      name={user?.name ?? ""}
      email={user?.email ?? ""}
      image={user?.image ?? ""}
      bodyStats={{
        weightKg: user?.weightKg ?? null,
        heightCm: user?.heightCm ?? null,
        age: user?.age ?? null,
        biologicalSex: (user?.biologicalSex as "male" | "female" | "unspecified" | null) ?? null,
        fitnessGoal: (user?.fitnessGoal as "lose_weight" | "maintain" | "gain_muscle" | null) ?? null,
        unitSystem: (user?.unitSystem as "metric" | "imperial") ?? "metric",
      }}
    />
  );
}
