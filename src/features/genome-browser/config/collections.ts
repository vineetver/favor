// src/features/genome-browser/config/collections.ts
// Pre-built track collections for common analysis workflows.
// All track IDs must exist in the registry.

import type { TrackCollection } from '../types/tracks'

export const TRACK_COLLECTIONS: Record<string, TrackCollection> = {
  'minimal': {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just gene annotations.',
    trackIds: ['gene-annotation'],
  },
  'clinical-essential': {
    id: 'clinical-essential',
    name: 'Clinical Essential',
    description:
      'Core tracks for variant interpretation: genes, ClinVar, CADD, AlphaMissense.',
    trackIds: [
      'gene-annotation',
      'clinvar',
      'cadd-a',
      'cadd-c',
      'cadd-g',
      'cadd-t',
      'alphamissense-a',
      'alphamissense-c',
      'alphamissense-g',
      'alphamissense-t',
    ],
  },
  'regulatory-analysis': {
    id: 'regulatory-analysis',
    name: 'Regulatory Analysis',
    description:
      'Genes, cCREs, aggregated epigenetic signal, and ChIA-PET / Hi-C loops.',
    trackIds: [
      'gene-annotation',
      'ccre',
      'h3k27ac',
      'h3k4me3',
      'atac',
      'dnase',
      'ctcf',
      'chromatin-arc',
    ],
  },
  'variant-impact': {
    id: 'variant-impact',
    name: 'Variant Impact',
    description: 'Pathogenicity predictions and conservation context.',
    trackIds: [
      'gene-annotation',
      'clinvar',
      'cadd-a',
      'cadd-c',
      'cadd-g',
      'cadd-t',
      'gerpn',
      'gerpr',
      'gnocchi',
    ],
  },
  'perturbation': {
    id: 'perturbation',
    name: 'Perturbation Evidence',
    description: 'CRISPR functional screens and eQTLs linked to genes.',
    trackIds: ['gene-annotation', 'ccre', 'crispr-arc', 'eqtl-arc'],
  },
}

export type CollectionId = keyof typeof TRACK_COLLECTIONS

export function getCollectionById(id: string): TrackCollection | undefined {
  return TRACK_COLLECTIONS[id as CollectionId]
}

export function getAllCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS)
}

export function getStandardCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS).filter(c => !c.requiresTissue)
}

export function getTissueCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS).filter(c => c.requiresTissue === true)
}
