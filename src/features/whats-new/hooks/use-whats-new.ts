"use client";

import { useEffect, useMemo, useState } from "react";
import { RELEASES, type Release } from "@/app/docs/release-notes/releases";
import { useWhatsNewStorage } from "./use-whats-new-storage";

const PRIMED_KEY = "favor:whats-new-primed";

interface UseWhatsNew {
  /** Releases ordered newest-first (by date). */
  releases: Release[];
  /** Number of releases the user hasn't seen yet. */
  unreadCount: number;
  /** Whether the given release version is currently unread. */
  isUnread: (version: string) => boolean;
  /** Whether any unread release contains a change with this navSlug. */
  hasUnreadFor: (navSlug: string) => boolean;
  /** Mark one or more release versions as seen. */
  markSeen: (versions: string[]) => void;
  /** Mark every listed release as seen. */
  markAllSeen: () => void;
}

/**
 * What's New state, sourced directly from /docs/release-notes (RELEASES).
 *
 * The seen-set keys on `release.version` (e.g. "2026.04.09"). First
 * visit ever auto-primes every current version as seen so brand-new
 * users don't see a wall of unread items they have no context for;
 * only versions added *after* their first visit show as unread.
 *
 * SSR/hydration: the underlying seen-set comes from localStorage, which
 * isn't available on the server. To avoid a flash where every release
 * paints as "new" before localStorage is read, we gate every unread-
 * derived value on a `hydrated` flag that flips true after the first
 * client effect. SSR + initial client render both report "all seen"
 * (no badge, no NewDot, no row highlight); the real state appears once,
 * post-mount.
 */
export function useWhatsNew(): UseWhatsNew {
  const storage = useWhatsNewStorage();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const releases = useMemo(
    () => [...RELEASES].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  );

  // First-visit priming runs once after hydration. Idempotent — if the
  // PRIMED_KEY write fails, the next visit re-primes harmlessly.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (window.localStorage.getItem(PRIMED_KEY)) return;
    } catch {
      return;
    }
    storage.set(releases.map((r) => r.version));
    try {
      window.localStorage.setItem(PRIMED_KEY, "1");
    } catch {
      // Quota / disabled — accept that we'll re-prime next visit.
    }
  }, [hydrated, storage, releases]);

  const unreadCount = useMemo(
    () =>
      hydrated
        ? releases.reduce((n, r) => (storage.has(r.version) ? n : n + 1), 0)
        : 0,
    [hydrated, storage, releases],
  );

  const isUnread = (version: string): boolean =>
    hydrated && !storage.has(version);

  const hasUnreadFor = (navSlug: string): boolean =>
    hydrated &&
    releases.some(
      (r) =>
        !storage.has(r.version) && r.changes.some((c) => c.navSlug === navSlug),
    );

  return {
    releases,
    unreadCount,
    isUnread,
    hasUnreadFor,
    markSeen: storage.add,
    markAllSeen: () => storage.add(releases.map((r) => r.version)),
  };
}
