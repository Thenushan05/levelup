import Link from "next/link";
import { Users } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import type { PartyActivityDTO } from "@/actions/party";

export function PartyActivityPreview({
  activity,
  hasParty,
}: {
  activity: PartyActivityDTO[];
  hasParty: boolean;
}) {
  if (!hasParty) {
    return (
      <EmptyState
        title="NO PARTY YET"
        description="Create or join a party to see your gym bros' activity here."
        icon={Users}
        action={
          <Link href="/party" className="text-sm text-primary hover:underline">
            Go to Party
          </Link>
        }
      />
    );
  }

  return (
    <SystemPanel className="space-y-3">
      <div className="flex items-center justify-between">
        <SystemLabel accent>Party Activity</SystemLabel>
        <Link href="/party" className="text-xs text-primary hover:underline">
          View party
        </Link>
      </div>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet. Get training!</p>
      ) : (
        <ul className="space-y-2">
          {activity.slice(0, 5).map((a) => (
            <li key={a.id} className="text-sm">
              <span className="text-foreground">{a.title}</span>
              {a.message && <span className="text-muted-foreground"> — {a.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </SystemPanel>
  );
}
