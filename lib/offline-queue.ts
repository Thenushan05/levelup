"use client";

import type { UpdateSetInput } from "@/lib/validations/workout";

/**
 * Offline write queue for the two actions worth logging mid-workout with bad
 * gym signal: gym check-in and set logging. Backed by IndexedDB (not
 * localStorage) since it holds structured records and needs to survive a
 * page reload/app relaunch while offline, not just a single tab session.
 *
 * Deliberately NOT using the Background Sync API — it's Chrome/Android-only
 * (no Safari, no Firefox until recently), which would leave iOS with zero
 * sync capability. Plain `online`/`offline` events work everywhere and cover
 * the realistic case here: bad signal *while the app is open*, not syncing
 * after the app was fully closed.
 */

const DB_NAME = "levelup-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";

/** Fired on window whenever the queue changes, so OfflineSyncManager can
 * react immediately instead of polling for new items. */
export const QUEUE_CHANGED_EVENT = "levelup-offline-queue-changed";

export type QueuedAction =
  | { id: string; kind: "checkIn"; payload: null; label: string; createdAt: number }
  | { id: string; kind: "updateSet"; payload: UpdateSetInput; label: string; createdAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueAction(action: Omit<QueuedAction, "id" | "createdAt">): Promise<void> {
  const db = await openDb();
  const full = { ...action, id: crypto.randomUUID(), createdAt: Date.now() } as QueuedAction;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  const result = await new Promise<QueuedAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAction[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedAction(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/**
 * Heuristic for "this failure means we couldn't reach the server" vs. "the
 * server was reached and legitimately rejected the request" — only the
 * former should get silently queued; the latter (e.g. "Quest not found")
 * needs to surface to the user like any other real error. Not airtight (no
 * client-side signal is), but `navigator.onLine` plus fetch's own
 * network-failure signature covers the real-world bad-signal case well.
 */
export function looksLikeNetworkFailure(err: unknown): boolean {
  if (!isOnline()) return true;
  if (err instanceof TypeError) return true; // fetch()'s own network-failure signature
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("fetch") || msg.includes("network") || msg.includes("load failed");
  }
  return false;
}
