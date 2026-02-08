// src/features/genome-browser/config/collections.ts
// Pre-built track collections for common workflows

import type { TrackCollection } from '../types/tracks'

// ─────────────────────────────────────────────────────────────────────────────
// TRACK COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const TRACK_COLLECTIONS: Record<string, TrackCollection> = {
  'clinical-essential': {
    id: 'clinical-essential',
    name: 'Clinical Essential',
    description: 'Core tracks for variant interpretation',
    trackIds: ['gene-annotation', 'clinvar', 'cadd', 'alphamissense'],
  },
  'regulatory-analysis': {
    id: 'regulatory-analysis',
    name: 'Regulatory Analysis',
    description: 'Epigenomic and regulatory elements',
    trackIds: ['gene-annotation', 'ccre'],
  },
  'variant-impact': {
    id: 'variant-impact',
    name: 'Variant Impact',
    description: 'Pathogenicity predictions and conservation',
    trackIds: ['gene-annotation', 'cadd', 'gerp', 'phylop', 'clinvar'],
  },
  'minimal': {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just gene annotations',
    trackIds: ['gene-annotation'],
  },
}

export type CollectionId = keyof typeof TRACK_COLLECTIONS

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ACCESSORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all collection IDs
 */
export function getCollectionIds(): CollectionId[] {
  return Object.keys(TRACK_COLLECTIONS) as CollectionId[]
}

/**
 * Get a collection by ID
 */
export function getCollectionById(id: string): TrackCollection | undefined {
  return TRACK_COLLECTIONS[id as CollectionId]
}

/**
 * Get all collections as an array
 */
export function getAllCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS)
}

/**
 * Get collections that don't require tissue selection
 */
export function getStandardCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS).filter(c => !c.requiresTissue)
}

/**
 * Get collections that require tissue selection
 */
export function getTissueCollections(): TrackCollection[] {
  return Object.values(TRACK_COLLECTIONS).filter(c => c.requiresTissue === true)
}
