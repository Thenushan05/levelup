"use server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

/**
 * Whether this account has permanently dismissed the install-app banner.
 * Returns false for a signed-out visitor — there's no account yet to attach
 * the preference to, so they fall back to the local (per-browser) dismiss
 * cooldown instead. Deliberately not using requireUserDoc() here: this needs
 * to resolve quietly on pages nobody's logged in on yet (login/register),
 * not throw.
 */
export async function getInstallPromptDismissed(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  await connectToDatabase();
  const user = await User.findById(session.user.id).select("installPromptDismissed").lean();
  return user?.installPromptDismissed ?? false;
}

export type DismissInstallPromptResult = { success: true } | { success: false; error: string };

/**
 * Permanently dismisses the install-app banner for this account — tied to
 * the account, not the browser, so it stays dismissed on every device the
 * player logs into, not just the one they clicked "Don't ask again" on.
 */
export async function dismissInstallPromptForever(): Promise<DismissInstallPromptResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in." };
  }
  await connectToDatabase();
  await User.updateOne({ _id: session.user.id }, { $set: { installPromptDismissed: true } });
  return { success: true };
}
