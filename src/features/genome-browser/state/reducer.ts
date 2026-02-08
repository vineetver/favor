// src/features/genome-browser/state/reducer.ts
// Pure reducer function for browser state management

import type {
  BrowserState,
  GenomicRegion,
  ActiveTrack,
  TrackDefinition,
} from '../types'
import type { TissueSource } from '../types/tissue'
import { createActiveTrack } from '../types/tracks'
import {
  zoomIn,
  zoomOut,
  panLeft,
  panRight,
} from '../utils/region-parser'

// ─────────────────────────────────────────────────────────────────────────────
// ACTION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type BrowserAction =
  | { type: 'INITIALIZE'; region: GenomicRegion; tracks: ActiveTrack[] }
  | { type: 'NAVIGATE_TO'; region: GenomicRegion }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'PAN_LEFT' }
  | { type: 'PAN_RIGHT' }
  | { type: 'RESET_VIEW'; initialRegion: GenomicRegion }
  | { type: 'TOGGLE_TRACK'; trackId: string; definition?: TrackDefinition }
  | { type: 'ADD_TRACK'; definition: TrackDefinition }
  | { type: 'REMOVE_TRACK'; trackId: string }
  | { type: 'REORDER_TRACKS'; fromIndex: number; toIndex: number }
  | { type: 'SET_TRACK_HEIGHT'; trackId: string; height: number }
  | { type: 'ADD_TISSUE_TRACK'; definition: TrackDefinition; source: TissueSource }
  | { type: 'LOAD_COLLECTION'; trackDefinitions: TrackDefinition[] }
  | { type: 'SET_LOADING' }
  | { type: 'SET_ERROR'; error: { code: 'PARSE_ERROR' | 'FETCH_ERROR' | 'RENDER_ERROR' | 'UNKNOWN'; message: string } }

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getMaxOrder(tracks: ActiveTrack[]): number {
  return Math.max(0, ...tracks.map(t =>
    t.visibility.state === 'visible' ? t.visibility.order : 0
  ))
}

function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

function updateTrackOrders(tracks: ActiveTrack[]): ActiveTrack[] {
  let order = 0
  return tracks.map(track => {
    if (track.visibility.state === 'visible') {
      return {
        ...track,
        visibility: { state: 'visible' as const, order: order++ }
      }
    }
    return track
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

export function browserReducer(state: BrowserState, action: BrowserAction): BrowserState {
  switch (action.type) {
    case 'INITIALIZE': {
      return {
        status: 'ready',
        region: action.region,
        tracks: action.tracks,
      }
    }

    case 'SET_LOADING': {
      if (state.status === 'idle') {
        return state // Can't set loading from idle
      }
      return {
        status: 'loading',
        region: state.status === 'ready' ? state.region : state.region,
      }
    }

    case 'SET_ERROR': {
      if (state.status === 'idle') {
        return state // Can't set error from idle
      }
      const region = state.status === 'ready' ? state.region : state.region
      return {
        status: 'error',
        region,
        error: action.error,
      }
    }

    case 'NAVIGATE_TO': {
      if (state.status !== 'ready') {
        return {
          status: 'ready',
          region: action.region,
          tracks: [],
        }
      }
      return {
        ...state,
        region: action.region,
      }
    }

    case 'ZOOM_IN': {
      if (state.status !== 'ready') return state
      const newRegion = zoomIn(state.region)
      if (!newRegion) return state // At min zoom
      return {
        ...state,
        region: newRegion,
      }
    }

    case 'ZOOM_OUT': {
      if (state.status !== 'ready') return state
      const newRegion = zoomOut(state.region)
      if (!newRegion) return state // At max zoom
      return {
        ...state,
        region: newRegion,
      }
    }

    case 'PAN_LEFT': {
      if (state.status !== 'ready') return state
      const newRegion = panLeft(state.region)
      if (!newRegion) return state
      return {
        ...state,
        region: newRegion,
      }
    }

    case 'PAN_RIGHT': {
      if (state.status !== 'ready') return state
      const newRegion = panRight(state.region)
      if (!newRegion) return state
      return {
        ...state,
        region: newRegion,
      }
    }

    case 'RESET_VIEW': {
      if (state.status !== 'ready') return state
      return {
        ...state,
        region: action.initialRegion,
      }
    }

    case 'TOGGLE_TRACK': {
      if (state.status !== 'ready') return state

      const existingIndex = state.tracks.findIndex(
        t => t.definition.id === action.trackId
      )

      // Track exists - toggle visibility
      if (existingIndex !== -1) {
        const track = state.tracks[existingIndex]
        const isVisible = track.visibility.state === 'visible'

        const newTracks = [...state.tracks]
        newTracks[existingIndex] = {
          ...track,
          visibility: isVisible
            ? { state: 'hidden' }
            : { state: 'visible', order: getMaxOrder(state.tracks) + 1 }
        }

        return {
          ...state,
          tracks: updateTrackOrders(newTracks),
        }
      }

      // Track doesn't exist - add it if definition provided
      if (action.definition) {
        const newTrack = createActiveTrack(
          action.definition,
          getMaxOrder(state.tracks) + 1
        )
        return {
          ...state,
          tracks: [...state.tracks, newTrack],
        }
      }

      return state
    }

    case 'ADD_TRACK': {
      if (state.status !== 'ready') return state

      // Don't add duplicates
      const exists = state.tracks.some(t => t.definition.id === action.definition.id)
      if (exists) return state

      const newTrack = createActiveTrack(
        action.definition,
        getMaxOrder(state.tracks) + 1
      )

      return {
        ...state,
        tracks: [...state.tracks, newTrack],
      }
    }

    case 'REMOVE_TRACK': {
      if (state.status !== 'ready') return state

      const newTracks = state.tracks.filter(
        t => t.definition.id !== action.trackId
      )

      return {
        ...state,
        tracks: updateTrackOrders(newTracks),
      }
    }

    case 'REORDER_TRACKS': {
      if (state.status !== 'ready') return state

      // Get only visible tracks in order
      const visibleTracks = state.tracks
        .filter(t => t.visibility.state === 'visible')
        .sort((a, b) => {
          const orderA = a.visibility.state === 'visible' ? a.visibility.order : 0
          const orderB = b.visibility.state === 'visible' ? b.visibility.order : 0
          return orderA - orderB
        })

      // Reorder visible tracks
      const reordered = reorderArray(visibleTracks, action.fromIndex, action.toIndex)

      // Rebuild full tracks array with new order
      const hiddenTracks = state.tracks.filter(t => t.visibility.state !== 'visible')
      const newVisibleTracks = reordered.map((track, index) => ({
        ...track,
        visibility: { state: 'visible' as const, order: index }
      }))

      return {
        ...state,
        tracks: [...newVisibleTracks, ...hiddenTracks],
      }
    }

    case 'SET_TRACK_HEIGHT': {
      if (state.status !== 'ready') return state

      const trackIndex = state.tracks.findIndex(
        t => t.definition.id === action.trackId
      )

      if (trackIndex === -1) return state

      const newTracks = [...state.tracks]
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        height: Math.max(50, Math.min(500, action.height)),
      }

      return {
        ...state,
        tracks: newTracks,
      }
    }

    case 'ADD_TISSUE_TRACK': {
      if (state.status !== 'ready') return state

      // Don't add duplicates
      const exists = state.tracks.some(t => t.definition.id === action.definition.id)
      if (exists) return state

      const newTrack = createActiveTrack(
        action.definition,
        getMaxOrder(state.tracks) + 1
      )

      return {
        ...state,
        tracks: [...state.tracks, newTrack],
      }
    }

    case 'LOAD_COLLECTION': {
      if (state.status !== 'ready') return state

      // Replace all tracks with collection tracks
      const newTracks = action.trackDefinitions.map((def, index) =>
        createActiveTrack(def, index)
      )

      return {
        ...state,
        tracks: newTracks,
      }
    }

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

export const initialBrowserState: BrowserState = { status: 'idle' }
