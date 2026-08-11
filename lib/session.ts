import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type UserDoc } from "@/models/User";
import type { HydratedDocument } from "mongoose";

export class UnauthorizedError extends Error {
  constructor(message = "SYSTEM ERROR: You must be logged in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Every protected server action starts here. Never trust a userId from the
 * client. Also guarantees the Mongoose connection is established — callers
 * that only need the id (not requireUserDoc()) still go on to query models
 * directly, and our connection is opened with `bufferCommands: false`, which
 * throws instead of queueing a query issued before `connect()` resolves.
 */
export async function requireUserId(): Promise<string> {
  const [session] = await Promise.all([auth(), connectToDatabase()]);
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user.id;
}

export async function requireUserDoc(): Promise<HydratedDocument<UserDoc>> {
  const userId = await requireUserId();
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Admin status is always re-checked fresh from the DB (never trusted from a
 * JWT claim), so revoking ADMIN_EMAILS takes effect on the very next action.
 */
export async function requireAdminDoc(): Promise<HydratedDocument<UserDoc>> {
  const user = await requireUserDoc();
  if (!user.isAdmin) {
    throw new UnauthorizedError("SYSTEM ERROR: Admin access required.");
  }
  return user;
}
