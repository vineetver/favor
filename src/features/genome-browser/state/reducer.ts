// src/features/genome-browser/state/reducer.ts
//
// Pure reducer for the browser state machine.
//
// State machine has two valid forms (see types/state.ts): 'idle' and 'ready'.
// Every action that mutates tracks or region is a no-op when the state is
// 'idle' — that's the only legitimate place to bail out, and it's covered by
// a single guard at the top of every case (no nested early returns).

import type { BrowserState, GenomicRegion } from "../types/state";
import type { TissueSource } from "../types/tissue";
import type { ActiveTrack, TrackDefinition } from "../types/tracks";
import { createActiveTrack } from "../types/tracks";
import { panLeft, panRight, zoomIn, zoomOut } from "../utils/region-parser";

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS — discriminated union
// ─────────────────────────────────────────────────────────────────────────────

export type BrowserAction =
  | { type: "NAVIGATE_TO"; region: GenomicRegion }
  | { type: "ZOOM_IN" }
  | { type: "ZOOM_OUT" }
  | { type: "PAN_LEFT" }
  | { type: "PAN_RIGHT" }
  | { type: "RESET_VIEW"; region: GenomicRegion }
  | { type: "TOGGLE_TRACK"; trackId: string; definition?: TrackDefinition }
  | { type: "ADD_TRACK"; definition: TrackDefinition }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "REORDER_TRACKS"; fromIndex: number; toIndex: number }
  | { type: "SET_TRACK_HEIGHT"; trackId: string; height: number }
  | {
      type: "ADD_TISSUE_TRACK";
      definition: TrackDefinition;
      source: TissueSource;
    }
  | { type: "LOAD_COLLECTION"; trackDefinitions: readonly TrackDefinition[] };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Highest currently-assigned visibility order. O(n) in track count, but n is
 * the user's *active* track set, expected ≤ 50 in practice.
 */
function getMaxOrder(tracks: readonly ActiveTrack[]): number {
  let max = 0;
  for (const t of tracks) {
    if (t.visibility.state === "visible" && t.visibility.order > max) {
      max = t.visibility.order;
    }
  }
  return max;
}

/**
 * Re-pack visibility order so visible tracks have contiguous indices starting
 * at 0. Run after a hide / remove / reorder so the order field stays a stable
 * single source of truth (no holes).
 */
function repackOrders(tracks: readonly ActiveTrack[]): ActiveTrack[] {
  let order = 0;
  return tracks.map((track) =>
    track.visibility.state === "visible"
      ? { ...track, visibility: { state: "visible" as const, order: order++ } }
      : track,
  );
}

function reorderArray<T>(array: readonly T[], from: number, to: number): T[] {
  const next = [...array];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

export function browserReducer(
  state: BrowserState,
  action: BrowserAction,
): BrowserState {
  if (state.status !== "ready") return state;

  switch (action.type) {
    case "NAVIGATE_TO":
      return { ...state, region: action.region };

    case "ZOOM_IN": {
      const next = zoomIn(state.region);
      return next ? { ...state, region: next } : state;
    }

    case "ZOOM_OUT": {
      const next = zoomOut(state.region);
      return next ? { ...state, region: next } : state;
    }

    case "PAN_LEFT": {
      const next = panLeft(state.region);
      return next ? { ...state, region: next } : state;
    }

    case "PAN_RIGHT": {
      const next = panRight(state.region);
      return next ? { ...state, region: next } : state;
    }

    case "RESET_VIEW":
      return { ...state, region: action.region };

    case "TOGGLE_TRACK": {
      const idx = state.tracks.findIndex(
        (t) => t.definition.id === action.trackId,
      );

      // New track — add it visible (only if a definition was supplied).
      if (idx === -1) {
        if (!action.definition) return state;
        const newTrack = createActiveTrack(
          action.definition,
          getMaxOrder(state.tracks) + 1,
        );
        return { ...state, tracks: [...state.tracks, newTrack] };
      }

      // Existing track — flip visibility.
      const existing = state.tracks[idx];
      const isVisible = existing.visibility.state === "visible";
      const nextTrack: ActiveTrack = {
        ...existing,
        visibility: isVisible
          ? { state: "hidden" }
          : { state: "visible", order: getMaxOrder(state.tracks) + 1 },
      };
      const nextTracks = state.tracks.slice();
      nextTracks[idx] = nextTrack;
      return { ...state, tracks: repackOrders(nextTracks) };
    }

    case "ADD_TRACK":
    case "ADD_TISSUE_TRACK": {
      const exists = state.tracks.some(
        (t) => t.definition.id === action.definition.id,
      );
      if (exists) return state;
      const newTrack = createActiveTrack(
        action.definition,
        getMaxOrder(state.tracks) + 1,
      );
      return { ...state, tracks: [...state.tracks, newTrack] };
    }

    case "REMOVE_TRACK": {
      const filtered = state.tracks.filter(
        (t) => t.definition.id !== action.trackId,
      );
      if (filtered.length === state.tracks.length) return state;
      return { ...state, tracks: repackOrders(filtered) };
    }

    case "REORDER_TRACKS": {
      const visible = state.tracks
        .filter((t) => t.visibility.state === "visible")
        .sort((a, b) => {
          const oa = a.visibility.state === "visible" ? a.visibility.order : 0;
          const ob = b.visibility.state === "visible" ? b.visibility.order : 0;
          return oa - ob;
        });

      const reordered = reorderArray(visible, action.fromIndex, action.toIndex);
      const repacked = reordered.map((track, index) => ({
        ...track,
        visibility: { state: "visible" as const, order: index },
      }));
      const hidden = state.tracks.filter(
        (t) => t.visibility.state !== "visible",
      );
      return { ...state, tracks: [...repacked, ...hidden] };
    }

    case "SET_TRACK_HEIGHT": {
      const idx = state.tracks.findIndex(
        (t) => t.definition.id === action.trackId,
      );
      if (idx === -1) return state;
      const clamped = Math.max(50, Math.min(500, action.height));
      if (state.tracks[idx].height === clamped) return state;
      const nextTracks = state.tracks.slice();
      nextTracks[idx] = { ...nextTracks[idx], height: clamped };
      return { ...state, tracks: nextTracks };
    }

    case "LOAD_COLLECTION": {
      const newTracks = action.trackDefinitions.map((def, index) =>
        createActiveTrack(def, index),
      );
      return { ...state, tracks: newTracks };
    }

    default: {
      // Exhaustiveness check
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
