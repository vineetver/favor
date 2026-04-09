// src/features/genome-browser/state/index.ts
// Narrow barrel — only what's actually consumed outside the module.

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
} from './browser-context'

export type { BrowserAction } from './reducer'
