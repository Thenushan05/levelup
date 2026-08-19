import type { Metadata } from "next";
import { Shield, UserCog } from "lucide-react";
import { getAllUsersAdmin } from "@/actions/admin-users";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { formatDisplayDate } from "@/lib/dates";
import { requiredXpForLevel } from "@/lib/xp";
import { DeleteUserButton } from "./delete-user-button";
import { GrantXpButton } from "./grant-xp-button";

export const metadata: Metadata = { title: "Admin — Users — LevelUp" };

export default async function AdminUsersPage() {
  const users = await getAllUsersAdmin();

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Admin</SystemLabel>
        <SystemHeading className="mt-1">User Management</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} account{users.length === 1 ? "" : "s"} registered. Deleting a user removes every record
          tied to them — attendance, workouts, achievements, pending XP, notifications, and party membership.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState title="NO USERS YET" description="Registered players will show up here." icon={UserCog} />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <SystemPanel key={u.id} noMotion className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="heading-system text-base">{u.name}</p>
                  {u.isAdmin && (
                    <span className="flex items-center gap-1 rounded border border-secondary/40 px-1.5 py-0.5 text-[10px] font-bold text-glow-violet">
                      <Shield className="h-3 w-3" /> ADMIN
                    </span>
                  )}
                  {!u.onboardingCompleted && (
                    <span className="label-system rounded border border-border px-1.5 py-0.5">NOT ONBOARDED</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  LV.{u.level} · RANK {u.rank} · {u.totalWorkouts} workout{u.totalWorkouts === 1 ? "" : "s"} ·{" "}
                  {u.currentStreak} day streak · joined {formatDisplayDate(u.createdAt.slice(0, 10))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <GrantXpButton id={u.id} name={u.name} level={u.level} xp={u.xp} requiredXp={requiredXpForLevel(u.level)} />
                <DeleteUserButton id={u.id} name={u.name} email={u.email} />
              </div>
            </SystemPanel>
          ))}
        </div>
      )}
    </div>
  );
}
