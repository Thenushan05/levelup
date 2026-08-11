import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validations/auth";
import { isAdminEmail } from "@/lib/admin";

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
