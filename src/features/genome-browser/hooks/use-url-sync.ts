"use client";

// src/features/genome-browser/hooks/use-url-sync.ts
//
// Bidirectional URL sync for the browser state.
//
// On mount: parse `?region=...&tracks=...` and replay into the reducer.
// On state change: debounce-write the same params back. The debounce
// effect depends on the reducer state directly — there is no intermediate
// `updateUrl` callback that would force the timer to reset on every render.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useBrowserActions, useBrowserDerived } from "../state/browser-context";
import { getTrackById } from "../tracks/registry";
import {
  formatRegion,
  parseRegionParam,
  parseTracksParam,
} from "../utils/region-parser";

type UseUrlSyncOptions = {
  enabled?: boolean;
};

const URL_DEBOUNCE_MS = 300;

export function useUrlSync({ enabled = true }: UseUrlSyncOptions = {}) {
  const { state, region, visibleTracks } = useBrowserDerived();
  const actions = useBrowserActions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Restore from URL on mount only.
  useEffect(() => {
    if (!enabled || state.status !== "ready") return;

    const regionParam = searchParams.get("region");
    if (regionParam) {
      const parsed = parseRegionParam(regionParam);
      if (parsed) actions.navigateTo(parsed);
    }

    const tracksParam = searchParams.get("tracks");
    if (tracksParam) {
      for (const id of parseTracksParam(tracksParam)) {
        const def = getTrackById(id);
        if (def) actions.addTrack(def);
      }
    }
    // Mount-only restore — intentionally not depending on the params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    actions.addTrack,
    actions.navigateTo,
    searchParams.get,
    state.status,
  ]);

  // Debounced URL writeback. Re-runs only when the data the URL actually
  // depends on changes (region + visible-track set).
  useEffect(() => {
    if (!enabled || !region) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("region", formatRegion(region, { commas: false }));
      if (visibleTracks.length > 0) {
        params.set(
          "tracks",
          visibleTracks.map((t) => t.definition.id).join(","),
        );
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, URL_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [enabled, region, visibleTracks, pathname, router]);
}

/**
 * Build a shareable URL for the current browser state. Pure read; safe to
 * call from event handlers (e.g. "Copy link" button).
 */
export function useShareableUrl(): string | null {
  const { region, visibleTracks } = useBrowserDerived();
  const pathname = usePathname();

  if (!region) return null;

  const params = new URLSearchParams();
  params.set("region", formatRegion(region, { commas: false }));
  if (visibleTracks.length > 0) {
    params.set("tracks", visibleTracks.map((t) => t.definition.id).join(","));
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${pathname}?${params.toString()}`;
  }
  return `${pathname}?${params.toString()}`;
}
