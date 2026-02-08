// src/features/genome-browser/tracks/static/conservation.ts
// Conservation score tracks

import { History, Leaf } from 'lucide-react'
import type { StaticTrack, GoslingTrackSpec } from '../../types/tracks'
import { LINKING_ID } from './gene-annotation'

const gerpSpec: GoslingTrackSpec = {
  data: {
    type: 'bigwig',
    url: 'https://hgdownload.cse.ucsc.edu/gbdb/hg38/bbi/gerp.bw',
  },
  mark: 'bar',
  x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
  xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
  y: { field: 'value', type: 'quantitative' },
  color: { value: '#10B981' },
  stroke: { value: 'transparent' },
  opacity: { value: 0.8 },
  height: 50,
  style: {
    background: 'transparent',
    outline: 'transparent',
  },
}

export const gerpTrack: StaticTrack = {
  kind: 'static',
  id: 'gerp',
  name: 'GERP++',
  description: 'Genomic Evolutionary Rate Profiling scores',
  category: 'functional',
  defaultHeight: 50,
  icon: History,
  curated: false,
  spec: gerpSpec,
}

const phyloPSpec: GoslingTrackSpec = {
  data: {
    type: 'bigwig',
    url: 'https://hgdownload.cse.ucsc.edu/gbdb/hg38/bbi/phyloP100way.bw',
  },
  mark: 'bar',
  x: { field: 'start', type: 'genomic', linkingId: LINKING_ID },
  xe: { field: 'end', type: 'genomic', linkingId: LINKING_ID },
  y: { field: 'value', type: 'quantitative' },
  color: { value: '#14B8A6' },
  stroke: { value: 'transparent' },
  opacity: { value: 0.8 },
  height: 50,
  style: {
    background: 'transparent',
    outline: 'transparent',
  },
}

export const phyloPTrack: StaticTrack = {
  kind: 'static',
  id: 'phylop',
  name: 'phyloP100way',
  description: '100-way vertebrate conservation (phyloP)',
  category: 'functional',
  defaultHeight: 50,
  icon: Leaf,
  curated: false,
  spec: phyloPSpec,
}
