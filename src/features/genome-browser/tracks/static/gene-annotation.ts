// src/features/genome-browser/tracks/static/gene-annotation.ts
// Gene annotation track using Gosling server data

import { Dna } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'

// Shared linking ID for track synchronization
export const LINKING_ID = 'genome-browser-main'

// Gene annotation track from Gosling server with exon structure
const geneAnnotationSpec: GoslingTrackSpec = {
  id: 'gene-annotation',
  title: 'Genes (GENCODE)',
  alignment: 'overlay',
  data: {
    url: 'https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation',
    type: 'beddb',
    genomicFields: [
      { index: 1, name: 'start' },
      { index: 2, name: 'end' },
    ],
    valueFields: [
      { index: 5, name: 'strand', type: 'nominal' },
      { index: 3, name: 'name', type: 'nominal' },
    ],
    exonIntervalFields: [
      { index: 12, name: 'start' },
      { index: 13, name: 'end' },
    ],
  },
  tracks: [
    {
      dataTransform: [
        { type: 'filter', field: 'type', oneOf: ['gene'] },
      ],
      mark: 'text',
      text: { field: 'name', type: 'nominal' },
      x: {
        field: 'start',
        type: 'genomic',
        linkingId: LINKING_ID,
      },
      xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
      style: { dy: -12, textFontSize: 10 },
    },
    {
      dataTransform: [
        { type: 'filter', field: 'type', oneOf: ['exon'] },
      ],
      mark: 'rect',
      x: {
        field: 'start',
        type: 'genomic',
        linkingId: LINKING_ID,
      },
      xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
      size: { value: 10 },
    },
    {
      dataTransform: [
        { type: 'filter', field: 'type', oneOf: ['gene'] },
      ],
      mark: 'rule',
      x: {
        field: 'start',
        type: 'genomic',
        linkingId: LINKING_ID,
      },
      xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
      strokeWidth: { value: 2 },
    },
  ],
  row: { field: 'strand', type: 'nominal', domain: ['+', '-'] },
  color: { value: '#64748b' },
  tooltip: [
    { field: 'name', type: 'nominal', alt: 'Gene Name' },
    { field: 'strand', type: 'nominal', alt: 'Strand' },
    { field: 'start', type: 'genomic', alt: 'Gene Start' },
    { field: 'end', type: 'genomic', alt: 'Gene End' },
  ],
  width: 900,
  height: 80,
}

export const geneAnnotationTrack: StaticTrack = {
  kind: 'static',
  id: 'gene-annotation',
  name: 'Gene Annotation',
  description: 'GENCODE gene annotations with exon structure',
  category: 'annotation',
  defaultHeight: 80,
  icon: Dna,
  curated: true,
  spec: geneAnnotationSpec,
}
