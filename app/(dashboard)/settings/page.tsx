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
  const user = await User.findById(session.user.id).select("name email image").lean();

  return <SettingsView name={user?.name ?? ""} email={user?.email ?? ""} image={user?.image ?? ""} />;
}
