// src/features/genome-browser/state/index.ts
// Barrel export for state management

export {
  BrowserProvider,
  useBrowser,
  useBrowserState,
  useBrowserActions,
  useBrowserSelectors,
  useBrowserRegion,
  useVisibleTracks,
} from './browser-context'

export {
  browserReducer,
  initialBrowserState,
  type BrowserAction,
} from './reducer'
