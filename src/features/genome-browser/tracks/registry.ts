// src/features/genome-browser/tracks/registry.ts
// Single source of truth for all available tracks

import type { StaticTrack, TrackDefinition, TrackCategory } from '../types/tracks'
import { TRACK_CATEGORY_ORDER } from '../types/tracks'

// Static track imports
import { geneAnnotationTrack } from './static/gene-annotation'
import { clinvarTrack } from './static/clinvar'
import { caddTrack } from './static/cadd'
import { gerpTrack, phyloPTrack } from './static/conservation'
import { ccreTrack, alphaMissenseTrack } from './static/regulatory'

// ─────────────────────────────────────────────────────────────────────────────
// TRACK REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of all static tracks, keyed by track ID
 */
export const TRACK_REGISTRY = {
  // Annotation tracks
  'gene-annotation': geneAnnotationTrack,

  // Clinical tracks
  'clinvar': clinvarTrack,
  'alphamissense': alphaMissenseTrack,

  // Functional tracks
  'cadd': caddTrack,
  'gerp': gerpTrack,
  'phylop': phyloPTrack,

  // Regulatory tracks
  'ccre': ccreTrack,
} as const satisfies Record<string, StaticTrack>

export type TrackId = keyof typeof TRACK_REGISTRY

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY ACCESSORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all registered track IDs
 */
export function getTrackIds(): TrackId[] {
  return Object.keys(TRACK_REGISTRY) as TrackId[]
}

/**
 * Get a track definition by ID
 */
export function getTrackById(id: string): TrackDefinition | undefined {
  return TRACK_REGISTRY[id as TrackId]
}

/**
 * Get all tracks as an array
 */
export function getAllTracks(): StaticTrack[] {
  return Object.values(TRACK_REGISTRY)
}

/**
 * Get tracks by category
 */
export function getTracksByCategory(category: TrackCategory): StaticTrack[] {
  return Object.values(TRACK_REGISTRY).filter(track => track.category === category)
}

/**
 * Get tracks grouped by category, maintaining category order
 */
export function getTracksGroupedByCategory(): Map<TrackCategory, StaticTrack[]> {
  const grouped = new Map<TrackCategory, StaticTrack[]>()

  // Initialize in order
  for (const category of TRACK_CATEGORY_ORDER) {
    grouped.set(category, [])
  }

  // Populate
  for (const track of Object.values(TRACK_REGISTRY)) {
    const list = grouped.get(track.category)
    if (list) {
      list.push(track)
    }
  }

  // Remove empty categories
  for (const [category, tracks] of grouped) {
    if (tracks.length === 0) {
      grouped.delete(category)
    }
  }

  return grouped
}

/**
 * Get curated tracks (starred)
 */
export function getCuratedTracks(): StaticTrack[] {
  return Object.values(TRACK_REGISTRY).filter(track => track.curated === true)
}

/**
 * Get curated track IDs
 */
export function getCuratedTrackIds(): TrackId[] {
  return Object.entries(TRACK_REGISTRY)
    .filter(([, track]) => track.curated === true)
    .map(([id]) => id as TrackId)
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT TRACKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default tracks to show when browser first loads
 */
export const DEFAULT_TRACK_IDS: TrackId[] = [
  'gene-annotation',
  'clinvar',
]

/**
 * Get default track definitions
 */
export function getDefaultTracks(): StaticTrack[] {
  return DEFAULT_TRACK_IDS.map(id => TRACK_REGISTRY[id])
}
