'use client'

// src/features/genome-browser/state/browser-context.tsx
// React context for browser state management

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { GenomicRegion, ActiveTrack, TrackDefinition } from '../types'
import type { TissueSource } from '../types/tissue'
import { browserReducer, initialBrowserState, type BrowserAction } from './reducer'
import type { BrowserState } from '../types/state'

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT TYPE
// ─────────────────────────────────────────────────────────────────────────────

type BrowserContextValue = {
  state: BrowserState
  dispatch: Dispatch<BrowserAction>
  // Convenience action creators
  actions: {
    initialize: (region: GenomicRegion, tracks: ActiveTrack[]) => void
    navigateTo: (region: GenomicRegion) => void
    zoomIn: () => void
    zoomOut: () => void
    panLeft: () => void
    panRight: () => void
    resetView: (initialRegion: GenomicRegion) => void
    toggleTrack: (trackId: string, definition?: TrackDefinition) => void
    addTrack: (definition: TrackDefinition) => void
    removeTrack: (trackId: string) => void
    reorderTracks: (fromIndex: number, toIndex: number) => void
    setTrackHeight: (trackId: string, height: number) => void
    addTissueTrack: (definition: TrackDefinition, source: TissueSource) => void
    loadCollection: (trackDefinitions: TrackDefinition[]) => void
  }
  // Derived state selectors
  selectors: {
    visibleTracks: () => ActiveTrack[]
    trackById: (id: string) => ActiveTrack | undefined
    isTrackVisible: (id: string) => boolean
    canZoomIn: () => boolean
    canZoomOut: () => boolean
  }
}

const BrowserContext = createContext<BrowserContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type BrowserProviderProps = {
  children: ReactNode
  initialRegion?: GenomicRegion
  initialTracks?: ActiveTrack[]
}

export function BrowserProvider({
  children,
  initialRegion,
  initialTracks = [],
}: BrowserProviderProps) {
  const [state, dispatch] = useReducer(browserReducer, initialBrowserState, (initial) => {
    if (initialRegion) {
      return {
        status: 'ready' as const,
        region: initialRegion,
        tracks: initialTracks,
      }
    }
    return initial
  })

  // Action creators - stable references
  const actions = useMemo(() => ({
    initialize: (region: GenomicRegion, tracks: ActiveTrack[]) => {
      dispatch({ type: 'INITIALIZE', region, tracks })
    },
    navigateTo: (region: GenomicRegion) => {
      dispatch({ type: 'NAVIGATE_TO', region })
    },
    zoomIn: () => {
      dispatch({ type: 'ZOOM_IN' })
    },
    zoomOut: () => {
      dispatch({ type: 'ZOOM_OUT' })
    },
    panLeft: () => {
      dispatch({ type: 'PAN_LEFT' })
    },
    panRight: () => {
      dispatch({ type: 'PAN_RIGHT' })
    },
    resetView: (initialRegion: GenomicRegion) => {
      dispatch({ type: 'RESET_VIEW', initialRegion })
    },
    toggleTrack: (trackId: string, definition?: TrackDefinition) => {
      dispatch({ type: 'TOGGLE_TRACK', trackId, definition })
    },
    addTrack: (definition: TrackDefinition) => {
      dispatch({ type: 'ADD_TRACK', definition })
    },
    removeTrack: (trackId: string) => {
      dispatch({ type: 'REMOVE_TRACK', trackId })
    },
    reorderTracks: (fromIndex: number, toIndex: number) => {
      dispatch({ type: 'REORDER_TRACKS', fromIndex, toIndex })
    },
    setTrackHeight: (trackId: string, height: number) => {
      dispatch({ type: 'SET_TRACK_HEIGHT', trackId, height })
    },
    addTissueTrack: (definition: TrackDefinition, source: TissueSource) => {
      dispatch({ type: 'ADD_TISSUE_TRACK', definition, source })
    },
    loadCollection: (trackDefinitions: TrackDefinition[]) => {
      dispatch({ type: 'LOAD_COLLECTION', trackDefinitions })
    },
  }), [])

  // Selectors - derived state helpers
  const selectors = useMemo(() => ({
    visibleTracks: () => {
      if (state.status !== 'ready') return []
      return state.tracks
        .filter(t => t.visibility.state === 'visible')
        .sort((a, b) => {
          const orderA = a.visibility.state === 'visible' ? a.visibility.order : 0
          const orderB = b.visibility.state === 'visible' ? b.visibility.order : 0
          return orderA - orderB
        })
    },
    trackById: (id: string) => {
      if (state.status !== 'ready') return undefined
      return state.tracks.find(t => t.definition.id === id)
    },
    isTrackVisible: (id: string) => {
      if (state.status !== 'ready') return false
      const track = state.tracks.find(t => t.definition.id === id)
      return track?.visibility.state === 'visible'
    },
    canZoomIn: () => {
      if (state.status !== 'ready') return false
      return state.region.size > 100 // MIN_REGION_SIZE
    },
    canZoomOut: () => {
      if (state.status !== 'ready') return false
      return state.region.size < 10_000_000 // MAX_REGION_SIZE
    },
  }), [state])

  const value = useMemo(
    () => ({ state, dispatch, actions, selectors }),
    [state, actions, selectors]
  )

  return (
    <BrowserContext.Provider value={value}>
      {children}
    </BrowserContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main hook for accessing browser state and actions
 */
export function useBrowser() {
  const context = useContext(BrowserContext)
  if (!context) {
    throw new Error('useBrowser must be used within a BrowserProvider')
  }
  return context
}

/**
 * Hook for accessing only the browser state (read-only)
 */
export function useBrowserState() {
  const { state } = useBrowser()
  return state
}

/**
 * Hook for accessing browser actions (mutations)
 */
export function useBrowserActions() {
  const { actions } = useBrowser()
  return actions
}

/**
 * Hook for accessing browser selectors (derived state)
 */
export function useBrowserSelectors() {
  const { selectors } = useBrowser()
  return selectors
}

/**
 * Hook for accessing the current region (or null if not ready)
 */
export function useBrowserRegion(): GenomicRegion | null {
  const { state } = useBrowser()
  if (state.status === 'idle') return null
  return state.region
}

/**
 * Hook for accessing visible tracks in order
 */
export function useVisibleTracks(): ActiveTrack[] {
  const { selectors } = useBrowser()
  return selectors.visibleTracks()
}
