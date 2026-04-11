// src/features/genome-browser/index.ts
// Public API for the genome browser feature.

export { BrowserPage } from "./components/browser-page";
// Utility hooks
export { useShareableUrl, useUrlSync } from "./hooks";
// Narrow context hooks for external integration.
export {
  BrowserProvider,
  useBrowserActions,
  useBrowserRegion,
  useBrowserState,
  useCanZoomIn,
  useCanZoomOut,
  useIsTrackVisible,
  useVisibleTrackCount,
  useVisibleTrackIds,
  useVisibleTracks,
} from "./state";

// Domain types (only what callers actually need)
export type { BrowserState, Chromosome, GenomicRegion } from "./types/state";
export type {
  ActiveTrack,
  TrackCategory,
  TrackDefinition,
} from "./types/tracks";
