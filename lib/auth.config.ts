import type { NextAuthConfig } from "next-auth";

// Route groups like (dashboard) don't appear in the URL, so these are the
// actual top-level paths that require a session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/quest",
  "/routine",
  "/exercises",
  "/quest-log",
  "/progress",
  "/achievements",
  "/party",
  "/player",
  "/settings",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Edge-safe subset of the NextAuth config (no Mongoose/bcrypt imports) so it
 * can be used directly from middleware.ts. The Credentials provider itself
 * — which does hit the database — only lives in lib/auth.ts, which runs in
 * the Node.js runtime (server actions, the /api/auth route handler).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
      const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

      if (isProtected && !isLoggedIn) return false;
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
