"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { Button } from "@/components/ui/button";

/** Not in lib.dom.d.ts — Chrome/Android-only event fired when the browser
 * decides the page meets install criteria (manifest + service worker etc.). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "levelup-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // re-offer a week after "Not now"

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/**
 * Listens for Chrome/Android's `beforeinstallprompt` and surfaces our own
 * "Install LevelUp" banner instead of relying on the browser's own mini-
 * infobar. Clicking Install triggers the real native install dialog — a
 * page can never silently self-install, the browser always requires that
 * user-confirmed step.
 *
 * No equivalent exists on iOS Safari (Apple doesn't expose this event at
 * all) — there, "Add to Home Screen" stays a manual Share-sheet action.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Either way the one-shot prompt is now spent — don't hold a dead reference.
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:w-80">
      <SystemPanel className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-glow-cyan">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="heading-system text-sm">Install LevelUp</p>
          <p className="text-xs text-muted-foreground">Add it to your home screen for quick, app-like access.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={handleInstall} className="heading-system">
            Install
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleDismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SystemPanel>
    </div>
  );
}
