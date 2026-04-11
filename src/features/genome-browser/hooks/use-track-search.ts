"use client";

// src/features/genome-browser/hooks/use-track-search.ts
// Fuzzy search for tracks

import { useMemo } from "react";
import { getAllTracks, getTracksGroupedByCategory } from "../tracks/registry";
import type { StaticTrack, TrackCategory } from "../types/tracks";

/**
 * Search tracks by name or description
 */
export function useTrackSearch(query: string): StaticTrack[] {
  const allTracks = useMemo(() => getAllTracks(), []);

  return useMemo(() => {
    if (!query.trim()) return allTracks;

    const searchLower = query.toLowerCase().trim();

    return allTracks.filter((track) => {
      const nameMatch = track.name.toLowerCase().includes(searchLower);
      const descMatch = track.description.toLowerCase().includes(searchLower);
      const categoryMatch = track.category.toLowerCase().includes(searchLower);
      return nameMatch || descMatch || categoryMatch;
    });
  }, [allTracks, query]);
}

/**
 * Search tracks grouped by category
 */
export function useTrackSearchGrouped(
  query: string,
): Map<TrackCategory, StaticTrack[]> {
  const allGrouped = useMemo(() => getTracksGroupedByCategory(), []);

  return useMemo(() => {
    if (!query.trim()) return allGrouped;

    const searchLower = query.toLowerCase().trim();
    const filtered = new Map<TrackCategory, StaticTrack[]>();

    for (const [category, tracks] of allGrouped) {
      const matchingTracks = tracks.filter((track) => {
        const nameMatch = track.name.toLowerCase().includes(searchLower);
        const descMatch = track.description.toLowerCase().includes(searchLower);
        return nameMatch || descMatch;
      });

      if (matchingTracks.length > 0) {
        filtered.set(category, matchingTracks);
      }
    }

    return filtered;
  }, [allGrouped, query]);
}
