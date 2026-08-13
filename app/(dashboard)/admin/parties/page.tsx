import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getAllPartiesAdmin } from "@/actions/admin-parties";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { formatDisplayDate } from "@/lib/dates";
import { DeletePartyButton } from "./delete-party-button";

export const metadata: Metadata = { title: "Admin — Parties — ASCEND" };

export default async function AdminPartiesPage() {
  const parties = await getAllPartiesAdmin();

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Admin</SystemLabel>
        <SystemHeading className="mt-1">Party Management</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          {parties.length} part{parties.length === 1 ? "y" : "ies"} created. Deleting a party removes it for every
          member and clears its activity feed.
        </p>
      </div>

      {parties.length === 0 ? (
        <EmptyState title="NO PARTIES YET" description="Parties players create will show up here." icon={Users} />
      ) : (
        <div className="space-y-3">
          {parties.map((p) => (
            <SystemPanel key={p.id} noMotion className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="heading-system text-base">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  Created by {p.ownerName} · {p.memberCount} member{p.memberCount === 1 ? "" : "s"} · invite{" "}
                  {p.inviteCode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Created {formatDisplayDate(p.createdAt.slice(0, 10))}</p>
              </div>
              <DeletePartyButton id={p.id} name={p.name} memberCount={p.memberCount} />
            </SystemPanel>
          ))}
        </div>
      )}
    </div>
  );
}
