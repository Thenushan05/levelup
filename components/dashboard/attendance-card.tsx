"use client";

import { useState, useTransition } from "react";
import { DoorOpen } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Button } from "@/components/ui/button";
import { checkIn, type AttendanceStatusDTO } from "@/actions/attendance";
import { formatTime } from "@/lib/dates";
import { showAchievementToast, showErrorToast, showSystemToast, showXpPendingToast } from "@/lib/toast-system";
import { enqueueAction, looksLikeNetworkFailure } from "@/lib/offline-queue";

export function AttendanceCard({
  initial,
  restDay = false,
}: {
  initial: AttendanceStatusDTO;
  /** Today's scheduled day is a rest day — check-in isn't needed/allowed. */
  restDay?: boolean;
}) {
  const [status, setStatus] = useState(initial);
  const [pending, startTransition] = useTransition();

  async function queueOfflineCheckIn() {
    await enqueueAction({ kind: "checkIn", payload: null, label: "Gym Check-In" });
    setStatus({ checkedIn: true, checkedInAt: new Date().toISOString() });
    showSystemToast("Check-in queued", "You're offline — this will sync automatically once you're back online.");
  }

  function handleCheckIn() {
    startTransition(async () => {
      if (!navigator.onLine) {
        await queueOfflineCheckIn();
        return;
      }

      try {
        const result = await checkIn();
        if (!result.success) {
          showErrorToast(result.error);
          return;
        }
        setStatus({ checkedIn: true, checkedInAt: result.data.checkedInAt });
        showXpPendingToast(10, "Gym Check-In");
        result.data.achievementsUnlocked.forEach(showAchievementToast);
      } catch (err) {
        if (looksLikeNetworkFailure(err)) {
          await queueOfflineCheckIn();
          return;
        }
        showErrorToast("Something went wrong checking in.");
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
      {!status.checkedIn && restDay && (
        <p className="text-xs text-muted-foreground">Rest day — no check-in needed. Recover and come back tomorrow.</p>
      )}
      {!status.checkedIn && !restDay && (
        <Button onClick={handleCheckIn} disabled={pending} className="w-full heading-system tracking-widest">
          {pending ? "CHECKING IN..." : "CHECK IN"}
        </Button>
      )}
    </SystemPanel>
  );
}
