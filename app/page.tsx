import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id).select("onboardingCompleted").lean();
  redirect(user?.onboardingCompleted ? "/dashboard" : "/onboarding");
}
