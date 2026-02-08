// src/features/genome-browser/tracks/static/cadd.ts
// CADD score track specification

import { Calculator } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'
import { LINKING_ID } from './gene-annotation'

const caddSpec: GoslingTrackSpec = {
  data: {
    type: 'bigwig',
    url: 'https://hgdownload.cse.ucsc.edu/gbdb/hg38/bbi/cadd/cadd.bw',
  },
  mark: 'bar',
  x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
  xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
  y: { field: 'value', type: 'quantitative', range: [0, 40] },
  color: { value: '#6366F1' },
  stroke: { value: 'transparent' },
  opacity: { value: 0.8 },
  height: 60,
  style: {
    background: 'transparent',
    outline: 'transparent',
  },
}

export const caddTrack: StaticTrack = {
  kind: 'static',
  id: 'cadd',
  name: 'CADD 1.7',
  description: 'Combined Annotation Dependent Depletion scores',
  category: 'functional',
  defaultHeight: 60,
  icon: Calculator,
  curated: true,
  spec: caddSpec,
}
