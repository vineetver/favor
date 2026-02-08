// src/features/genome-browser/index.ts
// Public API for the genome browser feature (narrow export)

// Main component
export { BrowserPage } from './components/browser-page'

// State hooks (for external integration)
export {
  useBrowser,
  useBrowserState,
  useBrowserActions,
  useBrowserRegion,
  useVisibleTracks,
  BrowserProvider,
} from './state'

// Utility hooks
export { useUrlSync, useShareableUrl } from './hooks'

// Types (only what's needed externally)
export type {
  GenomicRegion,
  BrowserState,
  Chromosome,
} from './types/state'

export type {
  TrackDefinition,
  ActiveTrack,
  TrackCategory,
} from './types/tracks'
