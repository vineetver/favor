"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "favor:whats-new-seen";
const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Module-level cache so `getSnapshot()` returns a stable reference when
 * the underlying value hasn't changed. Required by useSyncExternalStore —
 * a fresh `new Set(...)` on every read would tear concurrent renders.
 */
let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<string> = EMPTY_SET;

function readSnapshot(): ReadonlySet<string> {
  if (typeof window === "undefined") return EMPTY_SET;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage disabled (private mode / file://) — treat as empty.
    return EMPTY_SET;
  }
  if (raw === cachedRaw) return cachedSet;
  cachedRaw = raw;
  if (!raw) {
    cachedSet = EMPTY_SET;
    return cachedSet;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedSet = new Set(parsed.filter((v) => typeof v === "string"));
      return cachedSet;
    }
  } catch {
    // Corrupt entry — fall through to empty.
  }
  cachedSet = EMPTY_SET;
  return cachedSet;
}

function getServerSnapshot(): ReadonlySet<string> {
  // Must be a stable reference so SSR / hydration align.
  return EMPTY_SET;
}

const listeners = new Set<() => void>();

function notifyAll(): void {
  for (const fn of listeners) fn();
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(notify);
    };
  }
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null /* clear() */) notify();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeSnapshot(next: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify([...next]);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Quota / disabled — best effort.
  }
  // The `storage` event only fires in *other* tabs; notify the current
  // tab manually so this hook re-renders.
  cachedRaw = raw;
  cachedSet = next;
  notifyAll();
}

interface Storage {
  has: (id: string) => boolean;
  add: (ids: string[]) => void;
  /** Replace the entire seen-set. Used for first-visit priming. */
  set: (ids: string[]) => void;
}

/**
 * React-19-friendly localStorage hook using `useSyncExternalStore`.
 *
 * - SSR-safe: server returns an empty set, hydration matches.
 * - Concurrent-safe: stable snapshot references, no tearing.
 * - Cross-tab sync via the native `storage` event.
 * - Same-tab writes notify subscribers manually since `storage` only
 *   fires across tabs.
 *
 * To swap to a server-backed store later (per-user record for
 * authenticated users), replace `readSnapshot` / `writeSnapshot` /
 * `subscribe` with calls to your sync layer; the hook surface stays
 * unchanged.
 */
export function useWhatsNewStorage(): Storage {
  const seen = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const has = useCallback((id: string) => seen.has(id), [seen]);

  const add = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const current = readSnapshot();
    let changed = false;
    const next = new Set(current);
    for (const id of ids) {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    }
    if (changed) writeSnapshot(next);
  }, []);

  const set = useCallback((ids: string[]) => {
    writeSnapshot(new Set(ids));
  }, []);

  return { has, add, set };
}
