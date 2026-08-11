"use client";

import { useState, useTransition } from "react";
import { DoorOpen } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Button } from "@/components/ui/button";
import { checkIn, type AttendanceStatusDTO } from "@/actions/attendance";
import { formatTime } from "@/lib/dates";
import { showAchievementToast, showErrorToast, showXpPendingToast } from "@/lib/toast-system";

export function AttendanceCard({ initial }: { initial: AttendanceStatusDTO }) {
  const [status, setStatus] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleCheckIn() {
    startTransition(async () => {
      try {
        const result = await checkIn();
        setStatus({ checkedIn: true, checkedInAt: result.checkedInAt });
        showXpPendingToast(10, "Gym Check-In");
        result.achievementsUnlocked.forEach(showAchievementToast);
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Unable to check in.");
      }
    });
  }

  return (
    <SystemPanel className="space-y-3">
      <SystemLabel accent>Gym Access</SystemLabel>
      <div className="flex items-center gap-3">
        <DoorOpen className="h-6 w-6 shrink-0 text-glow-cyan" />
        {status.checkedIn ? (
          <div>
            <p className="heading-system text-sm text-glow-cyan">ACCESS CONFIRMED</p>
            <p className="text-xs text-muted-foreground">
              Checked in {status.checkedInAt ? formatTime(new Date(status.checkedInAt)) : ""}
            </p>
          </div>
        ) : (
          <p className="heading-system text-sm text-muted-foreground">NOT CHECKED IN</p>
        )}
      </div>
      {!status.checkedIn && (
        <Button onClick={handleCheckIn} disabled={pending} className="w-full heading-system tracking-widest">
          {pending ? "CHECKING IN..." : "CHECK IN"}
        </Button>
      )}
    </SystemPanel>
  );
}
