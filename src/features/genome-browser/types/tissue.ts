// src/features/genome-browser/types/tissue.ts
// Tissue source types — drives off the production TissueConfig
// (see src/features/genome-browser/config/tissue-config.ts).

import {
  TissueConfig,
  type AssayInfo,
  type SubtissueInfo,
  getSubtissueByName,
} from '../config/tissue-config'

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED TYPES
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }

export type TissueId = Brand<string, 'TissueId'>
export type SubtissueId = Brand<string, 'SubtissueId'>
export type AssayName = Brand<string, 'AssayName'>

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE SOURCE — fully qualifies a dynamic tissue track
// ─────────────────────────────────────────────────────────────────────────────

export type TissueSource = {
  readonly tissue: TissueId
  readonly subtissue: SubtissueId
  readonly assay: AssayName
  readonly bigwigUrl: string
}

/**
 * Construct a tissue source by looking the assay up in TissueConfig.
 * Returns null if the tissue/subtissue/assay combo is missing or has no
 * bigwig URL — the dynamic track factory only emits tracks for renderable
 * (bigwig-backed) signals.
 */
export function createTissueSource(
  tissue: string,
  subtissue: string,
  assay: string
): TissueSource | null {
  const assayInfo = findAssay(tissue, subtissue, assay)
  if (!assayInfo?.bigwig) return null
  return {
    tissue: tissue as TissueId,
    subtissue: subtissue as SubtissueId,
    assay: assay as AssayName,
    bigwigUrl: assayInfo.bigwig,
  }
}

function findAssay(
  tissue: string,
  subtissue: string,
  assay: string
): AssayInfo | undefined {
  const sub = getSubtissueByName(tissue, subtissue)
  return sub?.assays.find(a => a.name === assay)
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSAY DISPLAY METADATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Color per assay — used for both the dynamic Gosling track and the UI
 * indicator next to each assay checkbox.
 */
export const ASSAY_COLORS: Record<string, string> = {
  dnase: '#2563eb',
  ctcf: '#dc2626',
  h3k4me3: '#16a34a',
  h3k27ac: '#ca8a04',
  atac: '#7c3aed',
  h3k4me1: '#ea580c',
  h3k27me3: '#0891b2',
}

export const ASSAY_LABELS: Record<string, string> = {
  dnase: 'DNase',
  ctcf: 'CTCF',
  h3k4me3: 'H3K4me3',
  h3k27ac: 'H3K27ac',
  atac: 'ATAC',
  h3k4me1: 'H3K4me1',
  h3k27me3: 'H3K27me3',
  ccres: 'cCREs',
}

export const ASSAY_DESCRIPTIONS: Record<string, string> = {
  dnase: 'DNase hypersensitive sites — chromatin accessibility',
  ctcf: 'CTCF binding — insulator / loop boundaries',
  h3k4me3: 'H3K4me3 — active promoters',
  h3k27ac: 'H3K27ac — active enhancers and promoters',
  atac: 'ATAC-seq — open chromatin',
  h3k4me1: 'H3K4me1 — primed and active enhancers',
  h3k27me3: 'H3K27me3 — Polycomb repression',
}

export function assayColor(assay: string): string {
  return ASSAY_COLORS[assay.toLowerCase()] ?? '#6b7280'
}

export function assayLabel(assay: string): string {
  return ASSAY_LABELS[assay.toLowerCase()] ?? assay.toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level tissues, in TissueConfig order. */
export function listTissues(): string[] {
  return Object.keys(TissueConfig)
}

/** Subtissues for a given tissue (or empty array if unknown). */
export function listSubtissues(tissue: string): SubtissueInfo[] {
  return TissueConfig[tissue] ?? []
}

/**
 * Renderable assays for a (tissue, subtissue) pair — only assays that have
 * a bigwig URL. Skips ccres because they're rendered via the static cCRE
 * track, not as a tissue-specific signal.
 */
export function listRenderableAssays(
  tissue: string,
  subtissue: string
): AssayInfo[] {
  const sub = getSubtissueByName(tissue, subtissue)
  if (!sub) return []
  return sub.assays.filter(a => Boolean(a.bigwig))
}

/**
 * Format a long subtissue name for display in select dropdowns.
 * The TissueConfig uses very long descriptive subtissue names like
 * "dorsolateral prefrontal cortex, male adult (89 years)..."; this just
 * capitalizes the first letter.
 */
export function formatSubtissue(name: string): string {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatTissue(tissue: string): string {
  return tissue
}

/**
 * Sanitize a subtissue name into a stable, URL-safe slug used in track IDs.
 * Matches master's `assayTrackId` slug logic so saved track IDs stay stable.
 */
export function sanitizeSubtissue(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
