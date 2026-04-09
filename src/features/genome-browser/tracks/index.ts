// src/features/genome-browser/tracks/index.ts
// Barrel export for track definitions and helpers.

export {
  TRACK_REGISTRY,
  getAllTracks,
  getTrackById,
  getTracksByCategory,
  getTracksGroupedByCategory,
  getCuratedTracks,
  DEFAULT_TRACK_IDS,
  getDefaultTracks,
} from './registry'

export { LINKING_ID } from './constants'

export { createTissueTrack, tissueTrackId } from './dynamic/tissue-track'
