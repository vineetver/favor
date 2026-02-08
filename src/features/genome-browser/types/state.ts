// src/features/genome-browser/types/state.ts
// Domain state types using discriminated unions to make invalid states unrepresentable

import type { TrackDefinition, ActiveTrack } from './tracks'

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED TYPES - Compile-time safety for domain primitives
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }

export type PositiveInt = Brand<number, 'PositiveInt'>
export type Chromosome = Brand<string, 'Chromosome'>

// ─────────────────────────────────────────────────────────────────────────────
// CHROMOSOME VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CHROMOSOMES = [
  'chr1', 'chr2', 'chr3', 'chr4', 'chr5', 'chr6', 'chr7', 'chr8', 'chr9', 'chr10',
  'chr11', 'chr12', 'chr13', 'chr14', 'chr15', 'chr16', 'chr17', 'chr18', 'chr19',
  'chr20', 'chr21', 'chr22', 'chrX', 'chrY', 'chrM'
] as const

export type ValidChromosome = typeof VALID_CHROMOSOMES[number]

export function isValidChromosome(value: string): value is ValidChromosome {
  return VALID_CHROMOSOMES.includes(value as ValidChromosome)
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOMIC REGION - Always valid when constructed
// ─────────────────────────────────────────────────────────────────────────────

export type GenomicRegion = {
  readonly chromosome: Chromosome
  readonly start: PositiveInt
  readonly end: PositiveInt
  readonly size: number // Derived, always end - start
}

// Constructor ensures validity
export function createGenomicRegion(
  chromosome: string,
  start: number,
  end: number
): GenomicRegion | null {
  if (!isValidChromosome(chromosome)) return null
  if (start < 0 || end < 0 || start >= end) return null
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null

  return {
    chromosome: chromosome as Chromosome,
    start: start as PositiveInt,
    end: end as PositiveInt,
    size: end - start,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER STATE - Discriminated union for explicit state machine
// ─────────────────────────────────────────────────────────────────────────────

export type BrowserError = {
  code: 'PARSE_ERROR' | 'FETCH_ERROR' | 'RENDER_ERROR' | 'UNKNOWN'
  message: string
  details?: unknown
}

export type BrowserState =
  | { status: 'idle' }
  | { status: 'loading'; region: GenomicRegion }
  | { status: 'ready'; region: GenomicRegion; tracks: ActiveTrack[] }
  | { status: 'error'; region: GenomicRegion; error: BrowserError }

// Type guards for state narrowing
export function isReady(state: BrowserState): state is Extract<BrowserState, { status: 'ready' }> {
  return state.status === 'ready'
}

export function isLoading(state: BrowserState): state is Extract<BrowserState, { status: 'loading' }> {
  return state.status === 'loading'
}

export function isError(state: BrowserState): state is Extract<BrowserState, { status: 'error' }> {
  return state.status === 'error'
}

export function hasRegion(state: BrowserState): state is Exclude<BrowserState, { status: 'idle' }> {
  return state.status !== 'idle'
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const ZOOM_FACTOR = 2
export const MIN_REGION_SIZE = 100 // bp
export const MAX_REGION_SIZE = 10_000_000 // 10 Mb
export const DEFAULT_REGION_SIZE = 80_000 // 80 kb
