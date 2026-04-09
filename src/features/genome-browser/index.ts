// src/features/genome-browser/index.ts
// Public API for the genome browser feature.

export { BrowserPage } from './components/browser-page'

// Narrow context hooks for external integration.
export {
  BrowserProvider,
  useBrowserState,
  useBrowserActions,
  useBrowserRegion,
  useVisibleTracks,
  useVisibleTrackIds,
  useVisibleTrackCount,
  useIsTrackVisible,
  useCanZoomIn,
  useCanZoomOut,
} from './state'

// Utility hooks
export { useUrlSync, useShareableUrl } from './hooks'

// Domain types (only what callers actually need)
export type { GenomicRegion, BrowserState, Chromosome } from './types/state'
export type {
  TrackDefinition,
  ActiveTrack,
  TrackCategory,
} from './types/tracks'
