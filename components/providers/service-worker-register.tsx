"use client";

import { useEffect } from "react";

/** Registers the no-op service worker (public/sw.js) so the app meets
 * Chrome's PWA install criteria. Silently no-ops in unsupported browsers. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
