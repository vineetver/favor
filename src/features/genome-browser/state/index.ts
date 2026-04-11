// src/features/genome-browser/state/index.ts
// Narrow barrel — only what's actually consumed outside the module.

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
} from "./browser-context";

export type { BrowserAction } from "./reducer";
