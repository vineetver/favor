// src/features/genome-browser/tracks/static/regulatory.ts
// Regulatory element tracks

import { Layers, Sparkles } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'
import { LINKING_ID } from './gene-annotation'

// cCRE color mapping
const ccreColorMapping = {
  PLS: '#dc2626',
  pELS: '#ea580c',
  dELS: '#fddc69',
  'CA-CTCF': '#0053DB',
  'CA-H3K4me3': '#ea580c',
  'CA-TF': '#9333ea',
  CA: '#62DF7D',
  TF: '#ec4899',
}

// ENCODE cCREs (candidate cis-regulatory elements)
const ccreSpec: GoslingTrackSpec = {
  alignment: 'overlay',
  title: 'cCREs',
  data: {
    url: 'https://higlass.genohub.org/api/v1/tileset_info/?d=ccre-updated-hg38',
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
      xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
      row: {
        field: 'ccre',
        type: 'nominal',
        domain: [
          'PLS',
          'pELS',
          'dELS',
          'CA-CTCF',
          'CA-H3K4me3',
          'CA-TF',
          'CA',
          'TF',
        ],
        padding: 1,
      },
      color: {
        field: 'ccre_full',
        type: 'nominal',
        domain: [
          'Promoter',
          'Proximal enhancer',
          'Distal enhancer',
          'Chromatin Accessible with CTCF',
          'Chromatin Accessible with H3K4me3',
          'Chromatin Accessible with TF',
          'Chromatin Accessible Only',
          'TF Only',
        ],
        range: [
          ccreColorMapping['PLS'],
          ccreColorMapping['pELS'],
          ccreColorMapping['dELS'],
          ccreColorMapping['CA-CTCF'],
          ccreColorMapping['CA-H3K4me3'],
          ccreColorMapping['CA-TF'],
          ccreColorMapping['CA'],
          ccreColorMapping['TF'],
        ],
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
  height: 190,
}

export const ccreTrack: StaticTrack = {
  kind: 'static',
  id: 'ccre',
  name: 'ENCODE cCREs',
  description: 'Candidate cis-regulatory elements from ENCODE',
  category: 'regulatory',
  defaultHeight: 190,
  icon: Layers,
  curated: true,
  spec: ccreSpec,
}

// AlphaMissense pathogenicity predictions (placeholder - needs real data URL)
const alphaMissenseSpec: GoslingTrackSpec = {
  data: {
    type: 'beddb',
    url: 'https://server.gosling-lang.org/api/v1/tileset_info/?d=clinvar-beddb',
    genomicFields: [
      { index: 1, name: 'start' },
      { index: 2, name: 'end' },
    ],
    valueFields: [
      { index: 7, name: 'pathogenicity', type: 'nominal' },
    ],
  },
  mark: 'point',
  x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
  color: {
    field: 'pathogenicity',
    type: 'nominal',
    domain: ['Pathogenic', 'Uncertain_significance', 'Benign'],
    range: ['#D32F2F', '#9E9E9E', '#388E3C'],
  },
  size: { value: 4 },
  opacity: { value: 0.7 },
  height: 60,
}

export const alphaMissenseTrack: StaticTrack = {
  kind: 'static',
  id: 'alphamissense',
  name: 'AlphaMissense',
  description: 'DeepMind AlphaMissense pathogenicity predictions',
  category: 'clinical',
  defaultHeight: 60,
  icon: Sparkles,
  curated: false,
  spec: alphaMissenseSpec,
}
