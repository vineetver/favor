// src/features/genome-browser/tracks/index.ts
// Barrel export for track definitions and helpers.

export { LINKING_ID } from "./constants";
export { createTissueTrack, tissueTrackId } from "./dynamic/tissue-track";
export {
  DEFAULT_TRACK_IDS,
  getAllTracks,
  getCuratedTracks,
  getDefaultTracks,
  getTrackById,
  getTracksByCategory,
  getTracksGroupedByCategory,
  TRACK_REGISTRY,
} from "./registry";
