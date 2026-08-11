import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe proxy (formerly "middleware"): only decodes the session JWT (no
// database access), so it can import the lightweight authConfig instead of
// the full Mongoose/bcrypt-backed lib/auth.ts.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
