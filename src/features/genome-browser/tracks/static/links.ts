// src/features/genome-browser/tracks/static/links.ts
// Variant-to-gene and chromatin-loop link tracks. Each assay has two
// presentations:
//   • "arc" — withinLink arcs in a single track
//   • "overlay" — composite of cCRE rect + betweenLink + GENCODE gene
//                 annotation, three stacked sub-tracks
//
// The overlay variants exist in master as `OverlaidTracks[]` arrays;
// here they are encoded as `specs: [...]` arrays on a single StaticTrack
// so the user toggles them as one logical track.

import { Link2, Spline } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'
import { LINKING_ID } from '../constants'
import { CCRE_BEDDB_URL, ccreColorMapping } from './regulatory'

const HIGLASS = 'https://higlass.genohub.org/api/v1/tileset_info/?d='
const GENE_ANNOTATION_URL =
  'https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation'

const CCRE_FULL_DOMAIN = [
  'Promoter',
  'Proximal enhancer',
  'Distal enhancer',
  'Chromatin Accessible with CTCF',
  'Chromatin Accessible with H3K4me3',
  'Chromatin Accessible with TF',
  'Chromatin Accessible Only',
  'TF Only',
] as const

const CCRE_FULL_RANGE = [
  ccreColorMapping['PLS'],
  ccreColorMapping['pELS'],
  ccreColorMapping['dELS'],
  ccreColorMapping['CA-CTCF'],
  ccreColorMapping['CA-H3K4me3'],
  ccreColorMapping['CA-TF'],
  ccreColorMapping['CA'],
  ccreColorMapping['TF'],
] as const

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALUE-FIELD SCHEMAS for the three link sources
// ─────────────────────────────────────────────────────────────────────────────

const EQTL_VALUE_FIELDS = [
  { index: 0, name: 'chromosome', type: 'nominal' },
  { index: 3, name: 'accession', type: 'nominal' },
  { index: 4, name: 'ensembleID', type: 'nominal' },
  { index: 5, name: 'gene_name', type: 'nominal' },
  { index: 6, name: 'gene_type', type: 'nominal' },
  { index: 7, name: 'hic_experiment', type: 'nominal' },
  { index: 8, name: 'hic_experiment_id', type: 'nominal' },
  { index: 9, name: 'tissue', type: 'nominal' },
  { index: 11, name: 'p_value', type: 'quantitative' },
  { index: 12, name: 'chromosome2', type: 'nominal' },
  { index: 15, name: 'sig', type: 'nominal' },
] as const

const CRISPR_VALUE_FIELDS = [
  { index: 0, name: 'chromosome', type: 'nominal' },
  { index: 3, name: 'accession', type: 'nominal' },
  { index: 4, name: 'ensembleID', type: 'nominal' },
  { index: 5, name: 'gene_name', type: 'nominal' },
  { index: 6, name: 'gene_type', type: 'nominal' },
  { index: 7, name: 'gRNA_id', type: 'nominal' },
  { index: 8, name: 'assay_type', type: 'nominal' },
  { index: 9, name: 'experiment_id', type: 'nominal' },
  { index: 10, name: 'biosample', type: 'nominal' },
  { index: 11, name: 'effect_size', type: 'nominal' },
  { index: 12, name: 'p_value', type: 'quantitative' },
  { index: 13, name: 'chromosome2', type: 'nominal' },
  { index: 16, name: 'sig', type: 'nominal' },
] as const

const CHROMATIN_VALUE_FIELDS = [
  { index: 0, name: 'chromosome', type: 'nominal' },
  { index: 1, name: 'start_position', type: 'quantitative' },
  { index: 2, name: 'end_position', type: 'quantitative' },
  { index: 3, name: 'accession', type: 'nominal' },
  { index: 4, name: 'ensembleID', type: 'nominal' },
  { index: 5, name: 'gene_name', type: 'nominal' },
  { index: 6, name: 'gene_type', type: 'nominal' },
  { index: 7, name: 'assay_type', type: 'nominal' },
  { index: 8, name: 'experiment_id', type: 'nominal' },
  { index: 9, name: 'biosample', type: 'nominal' },
  { index: 10, name: 'score', type: 'nominal' },
  { index: 11, name: 'p_value', type: 'quantitative' },
  { index: 12, name: 'chromosome2', type: 'nominal' },
  { index: 15, name: 'sig', type: 'nominal' },
] as const

const PAIRED_GENOMIC_FIELDS_13 = [
  { index: 1, name: 'start' },
  { index: 2, name: 'end' },
  { index: 13, name: 'start2' },
  { index: 14, name: 'end2' },
] as const

const PAIRED_GENOMIC_FIELDS_14 = [
  { index: 1, name: 'start' },
  { index: 2, name: 'end' },
  { index: 14, name: 'start2' },
  { index: 15, name: 'end2' },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// ARC VARIANTS — single overlaid track of withinLinks
// ─────────────────────────────────────────────────────────────────────────────

function arcLinkSpec(opts: {
  url: string
  title: string
  genomicFields: ReadonlyArray<{ index: number; name: string }>
  valueFields: ReadonlyArray<{
    index: number
    name: string
    type: 'nominal' | 'quantitative'
  }>
  stroke: GoslingTrackSpec['stroke']
  tooltip: GoslingTrackSpec['tooltip']
  height?: number
}): GoslingTrackSpec {
  return {
    alignment: 'overlay',
    title: opts.title,
    data: {
      url: opts.url,
      type: 'beddb',
      genomicFields: opts.genomicFields,
      valueFields: opts.valueFields,
    },
    tracks: [
      {
        dataTransform: [{ type: 'filter', field: 'sig', oneOf: ['unknown'] }],
        mark: 'withinLink',
        x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
        x1: { field: 'start2', type: 'genomic' },
        x1e: { field: 'end2', type: 'genomic' },
        y: { flip: true },
        strokeWidth: { value: 1 },
        color: { value: 'none' },
        stroke: opts.stroke,
        style: { linePattern: { type: 'triangleLeft', size: 5 } },
        opacity: { value: 0.1 },
      },
      {
        dataTransform: [{ type: 'filter', field: 'sig', oneOf: ['significant'] }],
        mark: 'withinLink',
        x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
        x1: { field: 'start2', type: 'genomic' },
        x1e: { field: 'end2', type: 'genomic' },
        y: { flip: true },
        color: { value: 'none' },
        strokeWidth: { value: 2 },
        stroke: opts.stroke,
        opacity: { value: 0.9 },
      },
      {
        dataTransform: [
          { type: 'filter', field: 'sig', oneOf: ['insignificant'] },
        ],
        mark: 'withinLink',
        x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
        x1: { field: 'start2', type: 'genomic' },
        x1e: { field: 'end2', type: 'genomic' },
        y: { flip: true },
        color: { value: 'none' },
        strokeWidth: { value: 1 },
        stroke: opts.stroke,
        opacity: { value: 0.1 },
      },
    ],
    tooltip: opts.tooltip,
    width: 900,
    height: opts.height ?? 180,
  }
}

const eqtlArcSpec = arcLinkSpec({
  url: `${HIGLASS}eqtls-hg38`,
  title: 'eQTLs',
  genomicFields: PAIRED_GENOMIC_FIELDS_13,
  valueFields: EQTL_VALUE_FIELDS,
  stroke: { value: 'black' },
  tooltip: [
    { field: 'start', type: 'genomic', alt: 'Position' },
    { field: 'gene_name', type: 'nominal', alt: 'Linked To' },
    { field: 'accession', type: 'nominal', alt: 'Accession' },
    { field: 'gene_type', type: 'nominal', alt: 'Gene Type' },
    { field: 'tissue', type: 'nominal', alt: 'Tissue' },
    { field: 'p_value', type: 'quantitative', alt: 'P-value' },
  ],
})

const crisprArcSpec = arcLinkSpec({
  url: `${HIGLASS}crispr-hg38`,
  title: 'CRISPR',
  genomicFields: PAIRED_GENOMIC_FIELDS_14,
  valueFields: CRISPR_VALUE_FIELDS,
  stroke: { value: 'black' },
  tooltip: [
    { field: 'start', type: 'genomic', alt: 'Position' },
    { field: 'gene_name', type: 'nominal', alt: 'Linked To' },
    { field: 'accession', type: 'nominal', alt: 'Accession' },
    { field: 'gene_type', type: 'nominal', alt: 'Gene Type' },
    { field: 'biosample', type: 'nominal', alt: 'Biosample' },
    { field: 'p_value', type: 'quantitative', alt: 'P-value' },
  ],
})

const chromatinArcSpec = arcLinkSpec({
  url: `${HIGLASS}chromatin-hg38`,
  title: 'ChIA-PET & Intact-HiC',
  genomicFields: PAIRED_GENOMIC_FIELDS_13,
  valueFields: CHROMATIN_VALUE_FIELDS,
  stroke: {
    field: 'assay_type',
    type: 'nominal',
    domain: ['Intact-HiC', 'RNAPII-ChIAPET'],
    range: ['red', 'blue'],
  },
  tooltip: [
    { field: 'accession', type: 'nominal', alt: 'Accession' },
    { field: 'gene_name', type: 'nominal', alt: 'Linked to' },
    { field: 'assay_type', type: 'nominal', alt: 'Assay Type' },
    { field: 'p_value', type: 'quantitative', alt: 'P-value' },
    { field: 'sig', type: 'nominal', alt: 'Significance' },
  ],
})

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY VARIANTS — three stacked sub-tracks
//   1. cCRE points (displaced)
//   2. betweenLink rendering of significant pairs
//   3. GENCODE gene annotation
// ─────────────────────────────────────────────────────────────────────────────

const ccrePointsLayer: GoslingTrackSpec = {
  alignment: 'overlay',
  title: 'cCRE Points',
  data: {
    url: CCRE_BEDDB_URL,
    type: 'beddb',
    genomicFields: [
      { index: 1, name: 'start' },
      { index: 2, name: 'end' },
    ],
    valueFields: [
      { index: 0, name: 'chromosome', type: 'nominal' },
      { index: 1, name: 'start_position', type: 'nominal' },
      { index: 2, name: 'end_position', type: 'nominal' },
      { index: 3, name: 'elementId', type: 'nominal' },
      { index: 4, name: 'accession', type: 'nominal' },
      { index: 5, name: 'ccre', type: 'nominal' },
      { index: 6, name: 'ccre_full', type: 'nominal' },
    ],
  },
  dataTransform: [
    {
      type: 'displace',
      boundingBox: { startField: 'start', endField: 'end', padding: 5 },
      method: 'spread',
      newField: 'a',
    },
  ],
  tracks: [
    {
      mark: 'point',
      size: { value: 6 },
      color: {
        legend: true,
        field: 'ccre_full',
        type: 'nominal',
        domain: CCRE_FULL_DOMAIN,
        range: CCRE_FULL_RANGE,
      },
    },
  ],
  x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
  opacity: { value: 0.8 },
  style: { inlineLegend: true },
  tooltip: [
    { field: 'ccre_full', type: 'nominal', alt: 'cCRE Type' },
    { field: 'accession', type: 'nominal', alt: 'Accession' },
  ],
  width: 700,
  height: 60,
}

function betweenLinkLayer(opts: {
  url: string
  genomicFields: ReadonlyArray<{ index: number; name: string }>
  valueFields: ReadonlyArray<{
    index: number
    name: string
    type: 'nominal' | 'quantitative'
  }>
}): GoslingTrackSpec {
  return {
    alignment: 'overlay',
    data: {
      url: opts.url,
      type: 'beddb',
      genomicFields: opts.genomicFields,
      valueFields: opts.valueFields,
    },
    dataTransform: [
      { type: 'filter', field: 'sig', oneOf: ['significant'] },
      {
        type: 'displace',
        boundingBox: { startField: 'start', endField: 'end', padding: 5 },
        method: 'spread',
        newField: 'a',
      },
    ],
    tracks: [
      {
        mark: 'betweenLink',
        color: { value: '#029F73' },
        stroke: { value: 'lightgrey' },
        strokeWidth: { value: 1 },
        opacity: { value: 1 },
      },
    ],
    xe: { field: 'start', type: 'genomic' },
    x: { field: 'start2', type: 'genomic', linkingId: LINKING_ID },
    width: 700,
    height: 150,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED GENE-ANNOTATION CONSTANTS
//
// Each sub-track in the gene annotation overlay layer needs the same `data`
// block, the same row/color encoding, and the same width-visibility rule.
// Hoisting them as shared constants drops the file from ~626 to ~370 lines.
// ─────────────────────────────────────────────────────────────────────────────

const GENE_ANNO_DATA = {
  url: GENE_ANNOTATION_URL,
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
} as const

const GENE_ANNO_BASE = {
  data: GENE_ANNO_DATA,
  opacity: { value: 0.8 },
} as const

const GENE_ANNO_STRAND_BASE = {
  ...GENE_ANNO_BASE,
  row: { field: 'strand', type: 'nominal', domain: ['+', '-'] },
  color: {
    field: 'strand',
    type: 'nominal',
    domain: ['+', '-'],
    range: ['#7585FF', '#FF8A85'],
  },
  visibility: [
    {
      operation: 'less-than',
      measure: 'width',
      threshold: '|xe-x|',
      transitionPadding: 10,
      target: 'mark',
    },
  ],
} as const

const FILTER_FORWARD = [
  { type: 'filter', field: 'type', oneOf: ['gene'] },
  { type: 'filter', field: 'strand', oneOf: ['+'] },
] as const

const FILTER_REVERSE = [
  { type: 'filter', field: 'type', oneOf: ['gene'] },
  { type: 'filter', field: 'strand', oneOf: ['-'] },
] as const

const FILTER_GENES = [
  { type: 'filter', field: 'type', oneOf: ['gene'] },
] as const

const FILTER_EXONS = [
  { type: 'filter', field: 'type', oneOf: ['exon'] },
] as const

const geneAnnotationLayer: GoslingTrackSpec = {
  alignment: 'overlay',
  tracks: [
    {
      ...GENE_ANNO_STRAND_BASE,
      dataTransform: FILTER_FORWARD,
      mark: 'triangleRight',
      x: { field: 'end', type: 'genomic', axis: 'none', linkingId: LINKING_ID },
      size: { value: 15 },
    },
    {
      ...GENE_ANNO_BASE,
      dataTransform: FILTER_GENES,
      mark: 'text',
      text: { field: 'name', type: 'nominal' },
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      xe: { field: 'end', type: 'genomic' },
      style: { dy: -15 },
    },
    {
      ...GENE_ANNO_STRAND_BASE,
      dataTransform: FILTER_REVERSE,
      mark: 'triangleLeft',
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      size: { value: 15 },
      style: { align: 'right' },
    },
    {
      ...GENE_ANNO_BASE,
      dataTransform: FILTER_EXONS,
      mark: 'rect',
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      size: { value: 15 },
      xe: { field: 'end', type: 'genomic' },
    },
    {
      ...GENE_ANNO_STRAND_BASE,
      dataTransform: FILTER_FORWARD,
      mark: 'rule',
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      strokeWidth: { value: 3 },
      xe: { field: 'end', type: 'genomic' },
      style: { linePattern: { type: 'triangleRight', size: 5 } },
    },
    {
      ...GENE_ANNO_STRAND_BASE,
      dataTransform: FILTER_REVERSE,
      mark: 'rule',
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      strokeWidth: { value: 3 },
      xe: { field: 'end', type: 'genomic' },
      style: { linePattern: { type: 'triangleLeft', size: 5 } },
    },
  ],
  width: 700,
  height: 100,
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TRACKS
// ─────────────────────────────────────────────────────────────────────────────

export const eqtlArcTrack: StaticTrack = {
  kind: 'static',
  id: 'eqtl-arc',
  name: 'eQTLs (Arc Link)',
  description: 'Expression QTL variant→gene links rendered as arcs.',
  category: 'links',
  defaultHeight: 180,
  icon: Spline,
  curated: false,
  specs: [eqtlArcSpec],
}

export const eqtlOverlayTrack: StaticTrack = {
  kind: 'static',
  id: 'eqtl-overlay',
  name: 'eQTLs (Overlay Link)',
  description:
    'Composite eQTL view: cCRE points, between-element links, and gene annotation.',
  category: 'links',
  defaultHeight: 320,
  icon: Link2,
  curated: false,
  specs: [
    ccrePointsLayer,
    betweenLinkLayer({
      url: `${HIGLASS}eqtls-hg38`,
      genomicFields: PAIRED_GENOMIC_FIELDS_13,
      valueFields: EQTL_VALUE_FIELDS,
    }),
    geneAnnotationLayer,
  ],
}

export const crisprArcTrack: StaticTrack = {
  kind: 'static',
  id: 'crispr-arc',
  name: 'CRISPR (Arc Link)',
  description: 'CRISPR perturbation→gene links rendered as arcs.',
  category: 'links',
  defaultHeight: 180,
  icon: Spline,
  curated: false,
  specs: [crisprArcSpec],
}

export const crisprOverlayTrack: StaticTrack = {
  kind: 'static',
  id: 'crispr-overlay',
  name: 'CRISPR (Overlay Link)',
  description:
    'Composite CRISPR view: cCRE points, between-element links, and gene annotation.',
  category: 'links',
  defaultHeight: 320,
  icon: Link2,
  curated: false,
  specs: [
    ccrePointsLayer,
    betweenLinkLayer({
      url: `${HIGLASS}crispr-hg38`,
      genomicFields: PAIRED_GENOMIC_FIELDS_14,
      valueFields: CRISPR_VALUE_FIELDS,
    }),
    geneAnnotationLayer,
  ],
}

export const chromatinArcTrack: StaticTrack = {
  kind: 'static',
  id: 'chromatin-arc',
  name: 'ChIA-PET & Intact-HiC (Arc Link)',
  description: 'ChIA-PET and Intact-HiC chromatin loops rendered as arcs.',
  category: 'links',
  defaultHeight: 180,
  icon: Spline,
  curated: false,
  specs: [chromatinArcSpec],
}

export const chromatinOverlayTrack: StaticTrack = {
  kind: 'static',
  id: 'chromatin-overlay',
  name: 'ChIA-PET & Intact-HiC (Overlay Link)',
  description:
    'Composite chromatin loop view: cCRE points, between-element links, and gene annotation.',
  category: 'links',
  defaultHeight: 320,
  icon: Link2,
  curated: false,
  specs: [
    ccrePointsLayer,
    betweenLinkLayer({
      url: `${HIGLASS}chromatin-hg38`,
      genomicFields: PAIRED_GENOMIC_FIELDS_13,
      valueFields: CHROMATIN_VALUE_FIELDS,
    }),
    geneAnnotationLayer,
  ],
}

export const linkTracks: StaticTrack[] = [
  eqtlArcTrack,
  eqtlOverlayTrack,
  crisprArcTrack,
  crisprOverlayTrack,
  chromatinArcTrack,
  chromatinOverlayTrack,
]
