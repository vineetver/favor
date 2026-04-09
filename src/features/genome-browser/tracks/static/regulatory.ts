// src/features/genome-browser/tracks/static/regulatory.ts
// ENCODE candidate cis-regulatory elements (cCREs).
// Color mapping is exported because the link/overlay tracks reuse it.

import { Layers } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'
import { LINKING_ID } from '../constants'

export const ccreColorMapping: Record<string, string> = {
  PLS: '#dc2626',
  pELS: '#ea580c',
  dELS: '#fddc69',
  'CA-CTCF': '#0053DB',
  'CA-H3K4me3': '#ea580c',
  'CA-TF': '#9333ea',
  CA: '#62DF7D',
  TF: '#ec4899',
}

const CCRE_ROW_DOMAIN = [
  'PLS',
  'pELS',
  'dELS',
  'CA-CTCF',
  'CA-H3K4me3',
  'CA-TF',
  'CA',
  'TF',
] as const

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

export const CCRE_BEDDB_URL =
  'https://higlass.genohub.org/api/v1/tileset_info/?d=ccre-updated-hg38'

const ccreSpec: GoslingTrackSpec = {
  alignment: 'overlay',
  title: 'cCREs',
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
  tracks: [
    {
      dataTransform: [
        {
          type: 'concat',
          separator: '-',
          newField: 'region',
          fields: ['chromosome', 'start_position', 'end_position'],
        },
      ],
      mark: 'rect',
      size: { value: 10 },
      x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
      xe: { field: 'end', type: 'genomic' },
      row: {
        field: 'ccre',
        type: 'nominal',
        domain: CCRE_ROW_DOMAIN,
        padding: 1,
      },
      color: {
        field: 'ccre_full',
        type: 'nominal',
        domain: CCRE_FULL_DOMAIN,
        range: CCRE_FULL_RANGE,
        legend: true,
      },
      opacity: { value: 0.8 },
    },
  ],
  mouseEvents: {
    mouseOver: true,
    rangeSelect: true,
    groupMarksByField: 'name',
  },
  tooltip: [
    { field: 'ccre_full', type: 'nominal', alt: 'cCRE Type' },
    { field: 'accession', type: 'nominal', alt: 'Accession' },
  ],
  width: 900,
  height: 190,
}

export const ccreTrack: StaticTrack = {
  kind: 'static',
  id: 'ccre',
  name: 'cCREs',
  description:
    'ENCODE candidate cis-regulatory elements (PLS / pELS / dELS / CA / TF).',
  category: 'regulatory',
  defaultHeight: 190,
  icon: Layers,
  curated: true,
  specs: [ccreSpec],
}

export { CCRE_FULL_DOMAIN, CCRE_FULL_RANGE }
