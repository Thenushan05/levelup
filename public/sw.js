// Minimal service worker — exists purely to satisfy Chrome's install
// criteria (a registered SW with a fetch handler). It does no caching and
// never calls respondWith(), so every request still goes straight to the
// network exactly as if this file didn't exist.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
