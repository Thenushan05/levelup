/**
 * Bootstrapping admin access: list the account email(s) that should be
 * treated as admin in ADMIN_EMAILS (.env.local), comma-separated. There's no
 * UI to grant admin — it's intentionally an env-controlled allowlist so
 * privilege escalation can never happen through the app itself.
 */
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
