"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { Button } from "@/components/ui/button";
import { getInstallPromptDismissed, dismissInstallPromptForever } from "@/actions/preferences";

/** Not in lib.dom.d.ts — Chrome/Android-only event fired when the browser
 * decides the page meets install criteria (manifest + service worker etc.). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Mode = "android" | "ios" | null;

const DISMISSED_KEY = "levelup-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // re-offer a week after "Not now"
/** Local fallback for "Don't ask again" clicked while signed out — there's
 * no account yet to attach the preference to. */
const FOREVER_KEY = "levelup-install-dismissed-forever";

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iPhone/iPad, including iPadOS 13+ which disguises itself as "MacIntel"
 * but is still touch-capable — the one reliable way to tell it apart from
 * an actual Mac. */
function isIOS(): boolean {
  const nav = window.navigator;
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

/**
 * Android/Chrome: listens for `beforeinstallprompt` and surfaces our own
 * "Install LevelUp" banner instead of the browser's own mini-infobar.
 * Clicking Install triggers the real native install dialog — a page can
 * never silently self-install, the browser always requires that
 * user-confirmed step.
 *
 * iOS Safari (and any other iOS browser, since Add to Home Screen lives in
 * the system share sheet): there's no equivalent event at all — Apple never
 * exposes one — so instead we detect iOS directly and show manual
 * instructions for the Share -> Add to Home Screen flow.
 *
 * "Don't ask again" is stored on the account (installPromptDismissed on
 * User), not just this browser, so it follows the player to every device
 * they log into — falling back to a local flag only for a signed-out
 * visitor, who has no account yet to attach it to.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    let cancelled = false;
    let handler: ((e: Event) => void) | null = null;

    async function init() {
      try {
        if (isStandalone()) return;
        if (localStorage.getItem(FOREVER_KEY)) return;

        const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

        // Checked after the cheap local checks above, not before, so a
        // signed-out visitor never waits on a network round trip for nothing.
        const accountDismissed = await getInstallPromptDismissed();
        if (cancelled || accountDismissed) return;

        if (isIOS()) {
          setMode("ios");
          return;
        }

        handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setMode("android");
        };
        window.addEventListener("beforeinstallprompt", handler);
      } catch {
        // Fail closed — if dismissal state can't be determined, don't risk
        // nagging someone who already opted out.
      }
    }

    init();

    return () => {
      cancelled = true;
      if (handler) window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Either way the one-shot prompt is now spent — don't hold a dead reference.
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setMode(null);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setMode(null);
  }

  async function handleNeverAskAgain() {
    try {
      const result = await dismissInstallPromptForever();
      if (!result.success) localStorage.setItem(FOREVER_KEY, "1");
    } catch {
      localStorage.setItem(FOREVER_KEY, "1");
    }
    setMode(null);
  }

  if (!mode) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:w-80">
      <SystemPanel className="space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-glow-cyan">
            {mode === "ios" ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="heading-system text-sm">Install LevelUp</p>
            <p className="text-xs text-muted-foreground">
              {mode === "ios" ? (
                <>
                  Tap <span className="text-foreground">Share</span>, then{" "}
                  <span className="text-foreground">Add to Home Screen</span>.
                </>
              ) : (
                "Add it to your home screen for quick, app-like access."
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {mode === "android" && (
              <Button size="sm" onClick={handleInstall} className="heading-system">
                Install
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={handleDismiss} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNeverAskAgain}
          className="w-full text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Don&apos;t ask again
        </button>
      </SystemPanel>
    </div>
  );
}
