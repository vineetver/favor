// src/features/genome-browser/tracks/dynamic/tissue-track.ts
// Dynamic track factory for tissue-specific bigwig signal tracks.
//
// The bigwig URL is captured at TissueSource construction time (see
// types/tissue.ts → createTissueSource), so the spec factory is a pure
// function of (source, height) and never has to talk to TissueConfig.

import { FlaskConical } from 'lucide-react'
import type {
  DynamicTrack,
  DynamicTrackParams,
  GoslingTrackSpec,
} from '../../types/tracks'
import {
  type TissueSource,
  assayColor,
  assayLabel,
  formatSubtissue,
  formatTissue,
  sanitizeSubtissue,
} from '../../types/tissue'
import { LINKING_ID } from '../constants'

// ─────────────────────────────────────────────────────────────────────────────
// SPEC FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function createBigwigSpec(params: DynamicTrackParams): GoslingTrackSpec {
  const { source, height } = params
  const color = assayColor(source.assay)
  const label = assayLabel(source.assay)

  return {
    alignment: 'overlay',
    title: `${formatTissue(source.tissue)} – ${formatSubtissue(source.subtissue)} — ${label}`,
    data: {
      url: source.bigwigUrl,
      type: 'bigwig',
      column: 'position',
      value: 'value',
      aggregation: 'mean',
      binSize: 1,
    },
    tracks: [
      {
        mark: 'bar',
        x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
        xe: { field: 'end', type: 'genomic' },
        y: { field: 'value', type: 'quantitative', axis: 'right' },
        color: { value: color },
        stroke: { value: color },
        strokeWidth: { value: 0.8 },
        opacity: { value: 0.7 },
        tooltip: [
          { field: 'value', type: 'quantitative', alt: `${label} signal` },
          { field: 'start', type: 'genomic', alt: 'Start' },
          { field: 'end', type: 'genomic', alt: 'End' },
        ],
      },
    ],
    width: 800,
    height,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stable, URL-safe ID for a tissue-specific track.
 * Format matches master so existing query-string track lists keep working.
 */
export function tissueTrackId(source: TissueSource): string {
  return `dynamic_${source.assay}_${sanitizeSubtissue(source.subtissue)}`
}

export function createTissueTrack(source: TissueSource): DynamicTrack {
  const id = tissueTrackId(source)
  const label = assayLabel(source.assay)
  const subtissueDisplay = formatSubtissue(source.subtissue)
  const tissueDisplay = formatTissue(source.tissue)

  return {
    kind: 'dynamic',
    id,
    name: `${tissueDisplay} — ${subtissueDisplay} — ${label}`,
    description: `${label} signal in ${tissueDisplay.toLowerCase()} (${subtissueDisplay})`,
    category: 'tissue-specific',
    defaultHeight: 80,
    icon: FlaskConical,
    curated: false,
    source,
    specFactory: createBigwigSpec,
  }
}
