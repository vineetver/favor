// src/features/genome-browser/tracks/index.ts
// Barrel export for track definitions

export {
  TRACK_REGISTRY,
  type TrackId,
  getTrackIds,
  getTrackById,
  getAllTracks,
  getTracksByCategory,
  getTracksGroupedByCategory,
  getCuratedTracks,
  getCuratedTrackIds,
  DEFAULT_TRACK_IDS,
  getDefaultTracks,
} from './registry'

export { createTissueTrack, createEqtlTrack } from './dynamic/tissue-track'
