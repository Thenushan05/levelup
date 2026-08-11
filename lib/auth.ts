import crypto from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validations/auth";
import { isAdminEmail } from "@/lib/admin";

/**
 * ⚠️ HARDCODED ADMIN BACKDOOR — explicitly requested.
 *
 * This fixed email/password grants admin access below WITHOUT checking the
 * database's password hash. It's a real security anti-pattern:
 *   - It lives in source control (this repo is git-tracked) — anyone with
 *     repo/GitHub access can read these two lines and log in as admin.
 *   - It stays in git history forever, even after this block is deleted.
 *   - It bypasses every "no privilege escalation without DB access" guarantee
 *     the rest of this app relies on (see lib/admin.ts).
 * Delete the block below (and its use in `authorize`) to close it.
 */
const HARDCODED_ADMIN_EMAIL = "admin@ascend.local";
const HARDCODED_ADMIN_PASSWORD = "AscendAdmin123";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectToDatabase();

        // ⚠️ See HARDCODED_ADMIN_EMAIL/PASSWORD above — deliberate backdoor.
        if (parsed.data.email === HARDCODED_ADMIN_EMAIL && parsed.data.password === HARDCODED_ADMIN_PASSWORD) {
          let backdoorUser = await User.findOne({ email: HARDCODED_ADMIN_EMAIL });
          if (!backdoorUser) {
            backdoorUser = await User.create({
              name: "System Admin",
              email: HARDCODED_ADMIN_EMAIL,
              // Real bcrypt hash of a random, never-recorded value. This account is only
              // ever reachable through the hardcoded check above, never a real bcrypt.compare,
              // so this hash is never actually read — it only satisfies the required field.
              passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
              isAdmin: true,
              onboardingCompleted: true,
            });
          } else if (!backdoorUser.isAdmin) {
            backdoorUser.isAdmin = true;
            await backdoorUser.save();
          }
          return {
            id: backdoorUser._id.toString(),
            name: backdoorUser.name,
            email: backdoorUser.email,
            image: backdoorUser.image ?? undefined,
          };
        }

        const user = await User.findOne({ email: parsed.data.email });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Auto-heal admin status against the ADMIN_EMAILS allowlist on every
        // login, so adding/removing an email there takes effect immediately
        // without needing a one-off migration.
        const shouldBeAdmin = isAdminEmail(user.email);
        if (user.isAdmin !== shouldBeAdmin) {
          user.isAdmin = shouldBeAdmin;
          await user.save();
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
});
