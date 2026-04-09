// src/features/genome-browser/types/tracks.ts
// Track definition types for the genome browser.
//
// Why our own GoslingTrackSpec instead of importing Track from gosling.js?
// gosling.js's public entrypoint only re-exports `GoslingSpec` and
// `TemplateTrackDef` — the inner Track / OverlaidTracks types are not
// surfaced. We use a permissive structural type for tracks and a single
// well-typed cast at the spec-builder boundary (see browser-canvas.tsx).

import type { LucideIcon } from 'lucide-react'
import type { GenomicRegion } from './state'
import type { TissueSource } from './tissue'

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export type TrackCategory =
  | 'annotation'
  | 'integrative'
  | 'clinical'
  | 'conservation'
  | 'epigenetics'
  | 'mappability'
  | 'nucleotide-diversity'
  | 'regulatory'
  | 'links'
  | 'other'
  | 'tissue-specific'

export const TRACK_CATEGORY_LABELS: Record<TrackCategory, string> = {
  annotation: 'Gene Annotation',
  integrative: 'Integrative',
  clinical: 'Clinical Significance',
  conservation: 'Conservation',
  epigenetics: 'Epigenetics',
  mappability: 'Mappability',
  'nucleotide-diversity': 'Local Nucleotide Diversity',
  regulatory: 'Regulatory Elements',
  links: 'Single Cell / Tissue Links',
  other: 'Other',
  'tissue-specific': 'Tissue-Specific',
}

export const TRACK_CATEGORY_ORDER: TrackCategory[] = [
  'annotation',
  'integrative',
  'clinical',
  'conservation',
  'epigenetics',
  'regulatory',
  'links',
  'mappability',
  'nucleotide-diversity',
  'other',
  'tissue-specific',
]

// ─────────────────────────────────────────────────────────────────────────────
// GOSLING SPEC SHIM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permissive structural type for a single Gosling track spec.
 * Gosling's schema is heavily union-based and not exported from the package
 * root, so we keep an indexable shape and let the spec builder cast at the
 * boundary into the real `GoslingSpec` type.
 */
export type GoslingTrackSpec = {
  readonly [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE TRACK DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export type BaseTrackDefinition = {
  id: string
  name: string
  description: string
  category: TrackCategory
  defaultHeight: number
  icon: LucideIcon
  curated?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC TRACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A static track is one whose spec(s) are known at build time.
 *
 * `specs` is always an array because some production tracks (eQTLs Overlay,
 * CRISPR Overlay, ChIA-PET Overlay) are composites of multiple stacked sub-
 * tracks. Single-spec tracks just use a one-element array.
 */
export type StaticTrack = BaseTrackDefinition & {
  kind: 'static'
  specs: readonly GoslingTrackSpec[]
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC TRACK
// ─────────────────────────────────────────────────────────────────────────────

export type DynamicTrackParams = {
  region: GenomicRegion
  source: TissueSource
  height: number
}

export type DynamicTrack = BaseTrackDefinition & {
  kind: 'dynamic'
  source: TissueSource
  specFactory: (params: DynamicTrackParams) => GoslingTrackSpec
}

// ─────────────────────────────────────────────────────────────────────────────
// UNION + GUARDS
// ─────────────────────────────────────────────────────────────────────────────

export type TrackDefinition = StaticTrack | DynamicTrack

export function isStaticTrack(track: TrackDefinition): track is StaticTrack {
  return track.kind === 'static'
}

export function isDynamicTrack(track: TrackDefinition): track is DynamicTrack {
  return track.kind === 'dynamic'
}

// ─────────────────────────────────────────────────────────────────────────────
// VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

export type TrackVisibility =
  | { state: 'visible'; order: number }
  | { state: 'hidden' }
  | { state: 'loading' }

export function isVisible(
  visibility: TrackVisibility
): visibility is Extract<TrackVisibility, { state: 'visible' }> {
  return visibility.state === 'visible'
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE TRACK
// ─────────────────────────────────────────────────────────────────────────────

export type ActiveTrack = {
  definition: TrackDefinition
  visibility: TrackVisibility
  height: number
}

export function createActiveTrack(
  definition: TrackDefinition,
  order: number
): ActiveTrack {
  return {
    definition,
    visibility: { state: 'visible', order },
    height: definition.defaultHeight,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type TrackCollection = {
  id: string
  name: string
  description: string
  trackIds: string[]
  requiresTissue?: boolean
}
