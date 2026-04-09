// src/features/genome-browser/tracks/registry.ts
// Single source of truth for every static track in the genome browser.
//
// Each category file exports either a single StaticTrack or an array of
// StaticTracks; this module flattens them into one map keyed by track ID
// and exposes lookup / grouping helpers used by the track selector and the
// browser canvas.

import type {
  StaticTrack,
  TrackDefinition,
  TrackCategory,
} from '../types/tracks'
import { TRACK_CATEGORY_ORDER } from '../types/tracks'

import { geneAnnotationTrack } from './static/gene-annotation'
import { clinvarTrack } from './static/clinvar'
import { caddTracks } from './static/cadd'
import { alphaMissenseTracks } from './static/alphamissense'
import { conservationTracks } from './static/conservation'
import { epigeneticsTracks } from './static/epigenetics'
import { mappabilityTracks } from './static/mappability'
import { recombinationTracks } from './static/recombination'
import { ccreTrack } from './static/regulatory'
import { linkTracks } from './static/links'
import { otherTracks } from './static/other'

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

const ALL_STATIC_TRACKS: readonly StaticTrack[] = [
  // Gene annotation
  geneAnnotationTrack,

  // Integrative (CADD A/C/G/T)
  ...caddTracks,

  // Clinical significance
  clinvarTrack,
  ...alphaMissenseTracks,

  // Conservation
  ...conservationTracks,

  // Epigenetics
  ...epigeneticsTracks,

  // Regulatory
  ccreTrack,

  // Single Cell / Tissue link tracks
  ...linkTracks,

  // Mappability
  ...mappabilityTracks,

  // Local nucleotide diversity
  ...recombinationTracks,

  // Other
  ...otherTracks,
]

/**
 * Map of trackId → StaticTrack. Built once at module load.
 */
export const TRACK_REGISTRY: Readonly<Record<string, StaticTrack>> =
  Object.freeze(
    Object.fromEntries(ALL_STATIC_TRACKS.map(t => [t.id, t]))
  )

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getAllTracks(): StaticTrack[] {
  // Return a defensive copy so callers can use array methods like .filter
  // without fighting the readonly source-of-truth.
  return [...ALL_STATIC_TRACKS]
}

export function getTrackById(id: string): TrackDefinition | undefined {
  return TRACK_REGISTRY[id]
}

export function getTracksByCategory(
  category: TrackCategory
): StaticTrack[] {
  return ALL_STATIC_TRACKS.filter(t => t.category === category)
}

export function getTracksGroupedByCategory(): Map<TrackCategory, StaticTrack[]> {
  const grouped = new Map<TrackCategory, StaticTrack[]>()
  for (const category of TRACK_CATEGORY_ORDER) {
    grouped.set(category, [])
  }
  for (const track of ALL_STATIC_TRACKS) {
    const list = grouped.get(track.category)
    if (list) list.push(track)
  }
  // Drop empty buckets so the UI doesn't render hollow headers.
  for (const [category, tracks] of grouped) {
    if (tracks.length === 0) grouped.delete(category)
  }
  return grouped
}

export function getCuratedTracks(): StaticTrack[] {
  return ALL_STATIC_TRACKS.filter(t => t.curated === true)
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks shown when the browser first loads. Keep this short — every default
 * track triggers a tile fetch on mount.
 */
export const DEFAULT_TRACK_IDS = ['gene-annotation', 'ccre', 'clinvar'] as const

export function getDefaultTracks(): StaticTrack[] {
  return DEFAULT_TRACK_IDS.map(id => TRACK_REGISTRY[id]).filter(
    (t): t is StaticTrack => t !== undefined
  )
}
