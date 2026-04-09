'use client'

// src/features/genome-browser/state/browser-context.tsx
//
// Two-context provider for the genome browser. The split is the whole point:
//
//   • BrowserStateContext  — volatile, changes on every state mutation.
//                            Holds the reducer state PLUS precomputed
//                            derived values (visibleTracks, visibleTrackIds,
//                            region, canZoomIn/Out). Subscribers re-render
//                            only when one of these reads changes.
//
//   • BrowserActionsContext — stable for the lifetime of the provider.
//                             Holds the dispatch-bound action creators.
//                             Components that only need to mutate state
//                             never re-render at all.
//
// The bundled `useBrowser()` accessor is gone — every consumer subscribes
// to exactly one of the two contexts via narrow hooks.
//
// Selectors are exposed as VALUES, not functions:
//   • visibleTrackIds is a Set<string> — O(1) `has()` lookups, fixing the
//     O(n²) re-render hotspot in CategoryList.
//   • visibleTracks is a stable, sorted, frozen array reference that only
//     changes when the visible-track set actually changes.

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  isReady,
  type BrowserState,
  type GenomicRegion,
  MIN_REGION_SIZE,
  MAX_REGION_SIZE,
} from '../types/state'
import { initialBrowserState } from '../types/state'
import type { ActiveTrack, TrackDefinition } from '../types/tracks'
import type { TissueSource } from '../types/tissue'
import { browserReducer, type BrowserAction } from './reducer'

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT VALUE SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export type BrowserDerivedState = {
  /** Raw state, exposed for consumers that legitimately want the discriminant. */
  readonly state: BrowserState
  /** Current region, or null when status === 'idle'. Stable reference. */
  readonly region: GenomicRegion | null
  /** Visible tracks in render order. Stable reference between unrelated mutations. */
  readonly visibleTracks: readonly ActiveTrack[]
  /** O(1) membership lookup for the visible track id set. */
  readonly visibleTrackIds: ReadonlySet<string>
  /** Convenience: visibleTracks.length without an extra subscription hop. */
  readonly visibleTrackCount: number
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
}

export type BrowserActions = {
  navigateTo: (region: GenomicRegion) => void
  zoomIn: () => void
  zoomOut: () => void
  panLeft: () => void
  panRight: () => void
  resetView: (region: GenomicRegion) => void
  toggleTrack: (trackId: string, definition?: TrackDefinition) => void
  addTrack: (definition: TrackDefinition) => void
  removeTrack: (trackId: string) => void
  reorderTracks: (fromIndex: number, toIndex: number) => void
  setTrackHeight: (trackId: string, height: number) => void
  addTissueTrack: (definition: TrackDefinition, source: TissueSource) => void
  loadCollection: (trackDefinitions: readonly TrackDefinition[]) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTS
// ─────────────────────────────────────────────────────────────────────────────

const BrowserStateContext = createContext<BrowserDerivedState | null>(null)
const BrowserActionsContext = createContext<BrowserActions | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

type BrowserProviderProps = {
  children: ReactNode
  initialRegion?: GenomicRegion
  initialTracks?: readonly ActiveTrack[]
}

export function BrowserProvider({
  children,
  initialRegion,
  initialTracks,
}: BrowserProviderProps) {
  const [state, dispatch] = useReducer(
    browserReducer,
    null,
    (): BrowserState =>
      initialRegion
        ? {
            status: 'ready',
            region: initialRegion,
            tracks: initialTracks ?? [],
          }
        : initialBrowserState
  )

  // Actions are computed once and never change. Components that import only
  // useBrowserActions() will never re-render due to state changes.
  const actions = useMemo<BrowserActions>(
    () => ({
      navigateTo: region => dispatch({ type: 'NAVIGATE_TO', region }),
      zoomIn: () => dispatch({ type: 'ZOOM_IN' }),
      zoomOut: () => dispatch({ type: 'ZOOM_OUT' }),
      panLeft: () => dispatch({ type: 'PAN_LEFT' }),
      panRight: () => dispatch({ type: 'PAN_RIGHT' }),
      resetView: region => dispatch({ type: 'RESET_VIEW', region }),
      toggleTrack: (trackId, definition) =>
        dispatch({ type: 'TOGGLE_TRACK', trackId, definition }),
      addTrack: definition => dispatch({ type: 'ADD_TRACK', definition }),
      removeTrack: trackId => dispatch({ type: 'REMOVE_TRACK', trackId }),
      reorderTracks: (fromIndex, toIndex) =>
        dispatch({ type: 'REORDER_TRACKS', fromIndex, toIndex }),
      setTrackHeight: (trackId, height) =>
        dispatch({ type: 'SET_TRACK_HEIGHT', trackId, height }),
      addTissueTrack: (definition, source) =>
        dispatch({ type: 'ADD_TISSUE_TRACK', definition, source }),
      loadCollection: trackDefinitions =>
        dispatch({ type: 'LOAD_COLLECTION', trackDefinitions }),
    }),
    []
  )

  // Precomputed derived state. Each useMemo is keyed only on what it
  // actually reads, so e.g. canZoomIn doesn't recompute when a track is
  // toggled.
  const region = useMemo<GenomicRegion | null>(
    () => (isReady(state) ? state.region : null),
    [state]
  )

  const visibleTracks = useMemo<readonly ActiveTrack[]>(() => {
    if (!isReady(state)) return EMPTY_TRACK_ARRAY
    const visible = state.tracks.filter(t => t.visibility.state === 'visible')
    if (visible.length === 0) return EMPTY_TRACK_ARRAY
    return visible.slice().sort((a, b) => {
      const oa = a.visibility.state === 'visible' ? a.visibility.order : 0
      const ob = b.visibility.state === 'visible' ? b.visibility.order : 0
      return oa - ob
    })
  }, [state])

  const visibleTrackIds = useMemo<ReadonlySet<string>>(() => {
    if (visibleTracks.length === 0) return EMPTY_ID_SET
    const ids = new Set<string>()
    for (const t of visibleTracks) ids.add(t.definition.id)
    return ids
  }, [visibleTracks])

  const canZoomIn = useMemo(
    () => (region ? region.size > MIN_REGION_SIZE : false),
    [region]
  )

  const canZoomOut = useMemo(
    () => (region ? region.size < MAX_REGION_SIZE : false),
    [region]
  )

  const derived = useMemo<BrowserDerivedState>(
    () => ({
      state,
      region,
      visibleTracks,
      visibleTrackIds,
      visibleTrackCount: visibleTracks.length,
      canZoomIn,
      canZoomOut,
    }),
    [state, region, visibleTracks, visibleTrackIds, canZoomIn, canZoomOut]
  )

  return (
    <BrowserActionsContext.Provider value={actions}>
      <BrowserStateContext.Provider value={derived}>
        {children}
      </BrowserStateContext.Provider>
    </BrowserActionsContext.Provider>
  )
}

// Stable empty references to keep memo identity across mount/unmount cycles.
const EMPTY_TRACK_ARRAY: readonly ActiveTrack[] = Object.freeze([])
const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>()

// ─────────────────────────────────────────────────────────────────────────────
// NARROW HOOKS — pick exactly one of state OR actions, never both implicitly
// ─────────────────────────────────────────────────────────────────────────────

export function useBrowserDerived(): BrowserDerivedState {
  const ctx = useContext(BrowserStateContext)
  if (!ctx) {
    throw new Error('useBrowserDerived must be used within a BrowserProvider')
  }
  return ctx
}

export function useBrowserActions(): BrowserActions {
  const ctx = useContext(BrowserActionsContext)
  if (!ctx) {
    throw new Error('useBrowserActions must be used within a BrowserProvider')
  }
  return ctx
}

/** Raw discriminated state — usually you want one of the narrower hooks below. */
export function useBrowserState(): BrowserState {
  return useBrowserDerived().state
}

/** Current region, or null when the browser is idle. */
export function useBrowserRegion(): GenomicRegion | null {
  return useBrowserDerived().region
}

/** Stable, sorted, frozen array of visible tracks. */
export function useVisibleTracks(): readonly ActiveTrack[] {
  return useBrowserDerived().visibleTracks
}

/** Read-only Set of visible track IDs for O(1) membership tests. */
export function useVisibleTrackIds(): ReadonlySet<string> {
  return useBrowserDerived().visibleTrackIds
}

/** True if the given track ID is currently visible. O(1). */
export function useIsTrackVisible(id: string): boolean {
  return useBrowserDerived().visibleTrackIds.has(id)
}

/** Number of visible tracks. */
export function useVisibleTrackCount(): number {
  return useBrowserDerived().visibleTrackCount
}

/** Whether the user can zoom in further. */
export function useCanZoomIn(): boolean {
  return useBrowserDerived().canZoomIn
}

/** Whether the user can zoom out further. */
export function useCanZoomOut(): boolean {
  return useBrowserDerived().canZoomOut
}
