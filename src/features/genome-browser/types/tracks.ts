// src/features/genome-browser/types/tracks.ts
// Track definition types for the genome browser

import type { LucideIcon } from 'lucide-react'
import type { TissueSource } from './tissue'
import type { GenomicRegion } from './state'

// ─────────────────────────────────────────────────────────────────────────────
// TRACK CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export type TrackCategory =
  | 'annotation'      // Gene, transcript
  | 'clinical'        // ClinVar, AlphaMissense
  | 'functional'      // CADD, GERP, conservation
  | 'epigenetics'     // Histone marks, accessibility
  | 'regulatory'      // eQTLs, CRISPR, chromatin loops
  | 'gwas'            // Association signals
  | 'tissue-specific' // Dynamic tissue tracks

export const TRACK_CATEGORY_LABELS: Record<TrackCategory, string> = {
  annotation: 'Annotation',
  clinical: 'Clinical',
  functional: 'Functional',
  epigenetics: 'Epigenetics',
  regulatory: 'Regulatory',
  gwas: 'GWAS',
  'tissue-specific': 'Tissue-Specific',
}

export const TRACK_CATEGORY_ORDER: TrackCategory[] = [
  'annotation',
  'clinical',
  'functional',
  'epigenetics',
  'regulatory',
  'gwas',
  'tissue-specific',
]

// ─────────────────────────────────────────────────────────────────────────────
// GOSLING SPEC TYPES (permissive - Gosling has flexible schema)
// ─────────────────────────────────────────────────────────────────────────────

// Gosling track specification - using permissive type since Gosling.js has
// a very flexible schema with many optional properties and nested tracks
export type GoslingTrackSpec = Record<string, unknown> & {
  data?: Record<string, unknown>
  mark?: string
  tracks?: GoslingTrackSpec[]
  width?: number
  height?: number
  title?: string
}

// Full Gosling view spec
export type GoslingViewSpec = {
  tracks: GoslingTrackSpec[]
  layout?: 'linear' | 'circular'
  xDomain?: { chromosome: string; interval?: [number, number] }
  linkingId?: string
  alignment?: 'stack' | 'overlay'
  width?: number
  height?: number
  centerRadius?: number
  [key: string]: unknown
}

// Complete Gosling spec
export type GoslingSpec = {
  title?: string
  subtitle?: string
  description?: string
  views?: GoslingViewSpec[]
  tracks?: GoslingTrackSpec[]
  layout?: 'linear' | 'circular'
  xDomain?: { chromosome: string; interval?: [number, number] }
  linkingId?: string
  assembly?: 'hg38' | 'hg19' | 'hg18' | 'mm10' | 'mm9'
  style?: {
    background?: string
    outlineWidth?: number
    [key: string]: unknown
  }
  [key: string]: unknown
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
  curated?: boolean // Whether to show in curated section
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC TRACK - Spec known at build time
// ─────────────────────────────────────────────────────────────────────────────

export type StaticTrack = BaseTrackDefinition & {
  kind: 'static'
  spec: GoslingTrackSpec
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC TRACK - Spec generated from parameters
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
// UNION OF ALL TRACK TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TrackDefinition = StaticTrack | DynamicTrack

// Type guards
export function isStaticTrack(track: TrackDefinition): track is StaticTrack {
  return track.kind === 'static'
}

export function isDynamicTrack(track: TrackDefinition): track is DynamicTrack {
  return track.kind === 'dynamic'
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK VISIBILITY STATE
// ─────────────────────────────────────────────────────────────────────────────

export type TrackVisibility =
  | { state: 'visible'; order: number }
  | { state: 'hidden' }
  | { state: 'loading' }

// Type guards
export function isVisible(visibility: TrackVisibility): visibility is Extract<TrackVisibility, { state: 'visible' }> {
  return visibility.state === 'visible'
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE TRACK - Combines definition + runtime state
// ─────────────────────────────────────────────────────────────────────────────

export type ActiveTrack = {
  definition: TrackDefinition
  visibility: TrackVisibility
  height: number
}

// Helper to create an active track from a definition
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
// TRACK COLLECTION - Pre-built track sets
// ─────────────────────────────────────────────────────────────────────────────

export type TrackCollection = {
  id: string
  name: string
  description: string
  trackIds: string[]
  requiresTissue?: boolean
}
