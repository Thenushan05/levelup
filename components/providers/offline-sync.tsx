"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import {
  getQueuedActions,
  removeQueuedAction,
  looksLikeNetworkFailure,
  QUEUE_CHANGED_EVENT,
  type QueuedAction,
} from "@/lib/offline-queue";
import { showSystemToast, showErrorToast } from "@/lib/toast-system";
import { checkIn } from "@/actions/attendance";
import { updateSet } from "@/actions/workout";

async function runQueuedAction(action: QueuedAction): Promise<void> {
  if (action.kind === "checkIn") {
    const result = await checkIn();
    // "Already checked in" / "rest day" are stale-by-the-time-we-synced
    // outcomes, not sync failures — drop them rather than retrying forever.
    if (!result.success) return;
    return;
  }
  await updateSet(action.payload);
}

/**
 * Global offline-queue flusher, mounted once in Providers. Attempts a sync
 * pass whenever the browser comes back online (or on mount, if already
 * online and something was left queued from a previous session) — no
 * polling, purely event-driven.
 *
 * Note: a queued check-in re-runs at *sync* time, so if you queue one right
 * before midnight and it doesn't sync until after, it lands on the new day.
 * Acceptable trade-off for the realistic case here (bad signal, back online
 * minutes later in the same gym session) rather than building a full
 * backdated-check-in capability.
 */
export function OfflineSyncManager() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const items = await getQueuedActions();
    setPendingCount(items.length);
  }, []);

  const flush = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    let syncedCount = 0;
    let droppedCount = 0;
    try {
      const items = await getQueuedActions();
      for (const item of items) {
        try {
          await runQueuedAction(item);
          await removeQueuedAction(item.id);
          syncedCount += 1;
        } catch (err) {
          if (looksLikeNetworkFailure(err)) {
            // Still can't actually reach the server — stop here and leave
            // this and everything after it queued for the next attempt,
            // rather than dropping data over a transient connectivity blip.
            break;
          }
          // A genuine, permanent failure (e.g. the workout doc it targets no
          // longer exists) would otherwise jam the queue forever — every
          // later item is queued behind it and never gets a chance to sync.
          // Drop just this one, tell the player, and keep going.
          await removeQueuedAction(item.id);
          droppedCount += 1;
        }
      }
    } finally {
      syncingRef.current = false;
      await refreshCount();
      if (syncedCount > 0) {
        showSystemToast(
          "Synced",
          `${syncedCount} queued ${syncedCount === 1 ? "action" : "actions"} synced from offline mode.`
        );
        router.refresh();
      }
      if (droppedCount > 0) {
        showErrorToast(
          `${droppedCount} queued ${droppedCount === 1 ? "action" : "actions"} couldn't be synced and ${droppedCount === 1 ? "was" : "were"} discarded.`
        );
      }
    }
  }, [refreshCount, router]);

  useEffect(() => {
    // Deferred rather than called synchronously in the effect body — this is
    // a one-time read of external state (IndexedDB + connectivity) on mount,
    // not a subscription callback, so a microtask is the idiomatic way to
    // still avoid a synchronous setState-in-effect.
    const id = setTimeout(() => {
      refreshCount();
      if (navigator.onLine) flush();
    }, 0);

    window.addEventListener("online", flush);
    window.addEventListener(QUEUE_CHANGED_EVENT, flush);
    return () => {
      clearTimeout(id);
      window.removeEventListener("online", flush);
      window.removeEventListener(QUEUE_CHANGED_EVENT, flush);
    };
  }, [flush, refreshCount]);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:left-1/2 sm:w-auto sm:-translate-x-1/2">
      <SystemPanel variant="violet" noPadding className="flex items-center gap-2.5 px-4 py-2.5">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs">
          <span className="heading-system">{pendingCount}</span> {pendingCount === 1 ? "change" : "changes"} queued —
          will sync when back online.
        </p>
      </SystemPanel>
    </div>
  );
}
