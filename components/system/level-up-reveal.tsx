"use client";

import { useState } from "react";
import { LevelUpModal } from "@/components/system/level-up-modal";
import { acknowledgeLevelUp } from "@/actions/player";
import type { LevelUpResult } from "@/types";

/**
 * Shows the LEVEL UP celebration for a level the player hasn't seen yet.
 * XP is credited by admin approval (actions/approvals.ts), which usually
 * happens while the player isn't looking at their screen, so instead of
 * firing from a live action response, this detects "level moved past what
 * they last acknowledged" on page load and reveals it then.
 */
export function LevelUpReveal({ newLevelUp }: { newLevelUp: LevelUpResult | null }) {
  const [dismissed, setDismissed] = useState(false);

  if (!newLevelUp || dismissed) return null;

  async function handleClose() {
    // Await before dismissing (rather than fire-and-forget) so a quick
    // reload/navigation right after clicking CONTINUE can't abort the
    // request mid-flight and leave lastSeenLevel unsaved — which would
    // just show the exact same celebration again on the next visit.
    try {
      await acknowledgeLevelUp(newLevelUp!.toLevel);
    } finally {
      setDismissed(true);
    }
  }

  return <LevelUpModal levelUp={newLevelUp} onClose={handleClose} />;
}
