// src/features/genome-browser/tracks/dynamic/tissue-track.ts
// Dynamic track factory for tissue-specific tracks

import { FlaskConical } from 'lucide-react'
import type { DynamicTrack, DynamicTrackParams, GoslingTrackSpec } from '../../types/tracks'
import type { TissueSource } from '../../types/tissue'
import {
  formatTissueSource,
  ASSAY_LABELS,
  ASSAY_DESCRIPTIONS,
  type ValidAssayType,
} from '../../types/tissue'
import { LINKING_ID } from '../static/gene-annotation'

// ─────────────────────────────────────────────────────────────────────────────
// ASSAY COLORS
// ─────────────────────────────────────────────────────────────────────────────

const ASSAY_COLORS: Record<ValidAssayType, string> = {
  'h3k27ac': '#FF6B6B',    // Active enhancers - warm red
  'h3k4me3': '#4ECDC4',    // Active promoters - teal
  'h3k4me1': '#FFE66D',    // Enhancers - yellow
  'h3k27me3': '#95E1D3',   // Repression - light green
  'h3k9me3': '#F38181',    // Heterochromatin - coral
  'h3k36me3': '#AA96DA',   // Transcription - purple
  'atac-seq': '#6C5CE7',   // Open chromatin - violet
  'dnase-seq': '#A29BFE',  // DNase - lavender
  'ctcf': '#00CEC9',       // CTCF - cyan
  'pol2': '#FD79A8',       // Pol II - pink
}

// ─────────────────────────────────────────────────────────────────────────────
// BIGWIG SPEC FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a BigWig track spec for epigenomic signal data
 */
function createBigWigSpec(params: DynamicTrackParams): GoslingTrackSpec {
  const { source, height } = params
  const assayType = source.assay as ValidAssayType
  const color = ASSAY_COLORS[assayType] ?? '#6366F1'

  // Construct URL based on tissue/subtissue/assay
  // In production, this would point to actual ENCODE/Roadmap data
  const baseUrl = 'https://encode-public.s3.amazonaws.com/hg38'
  const url = `${baseUrl}/${source.tissue}/${source.subtissue}/${source.assay}.bigWig`

  return {
    data: {
      type: 'bigwig',
      url,
    },
    mark: 'bar',
    x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
    xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
    y: { field: 'value', type: 'quantitative' },
    color: { value: color },
    stroke: { value: 'transparent' },
    opacity: { value: 0.85 },
    height,
    style: {
      background: 'transparent',
      outline: 'transparent',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE TRACK FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a dynamic track definition for tissue-specific data
 */
export function createTissueTrack(source: TissueSource): DynamicTrack {
  const assayType = source.assay as ValidAssayType
  const id = `${source.tissue}-${source.subtissue}-${source.assay}`
  const name = formatTissueSource(source)
  const description = ASSAY_DESCRIPTIONS[assayType] ?? 'Epigenomic signal track'

  return {
    kind: 'dynamic',
    id,
    name,
    description,
    category: 'tissue-specific',
    defaultHeight: 60,
    icon: FlaskConical,
    curated: false,
    source,
    specFactory: createBigWigSpec,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EQTL TRACK FACTORY (Arc links)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an eQTL track showing variant-gene associations
 */
export function createEqtlTrack(source: Omit<TissueSource, 'assay'>): DynamicTrack {
  const id = `eqtl-${source.tissue}-${source.subtissue}`
  const tissueLabel = source.tissue
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return {
    kind: 'dynamic',
    id,
    name: `eQTLs (GTEx - ${tissueLabel})`,
    description: 'Expression quantitative trait loci from GTEx',
    category: 'regulatory',
    defaultHeight: 80,
    icon: FlaskConical,
    curated: false,
    source: { ...source, assay: 'eqtl' as TissueSource['assay'] },
    specFactory: (params) => ({
      data: {
        type: 'beddb',
        url: `https://gtex-portal.org/api/v2/eqtl/${source.tissue}`,
        genomicFields: ['variant_pos', 'gene_start', 'gene_end'],
      },
      mark: 'withinLink',
      x: { field: 'variant_pos', type: 'genomic', linkingId: LINKING_ID },
      xe: { field: 'gene_start', type: 'genomic', linkingId: LINKING_ID },
      stroke: { value: '#8B5CF6' },
      strokeWidth: { value: 1.5 },
      opacity: { value: 0.6 },
      height: params.height,
      style: {
        background: 'transparent',
        outline: 'transparent',
        linkStyle: 'elliptical',
        linkMinHeight: 0.3,
      },
    }),
  }
}
