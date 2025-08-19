import type { GoslingSpec } from "gosling.js";
import type { Track, OverlaidTracks } from "@/components/gosling";

// Track category types for better type safety
export type TrackCategoryId =
  | "other"
  | "single-cell-tissue"
  | "clinvar"
  | "mappability"
  | "local-nucleotide-diversity"
  | "conservation"
  | "integrative"
  | "gwas"
  | "tissue-specific";

export type RenderTime = "fast" | "medium" | "slow";
export type MemoryUsage = "low" | "medium" | "high";
export type ViewType = "linear" | "circular" | "overlay" | "stack";
export type ZoomBehavior = "adaptive" | "fixed" | "scalable";

// Union type for track data
export type TrackData = Track | Track[] | OverlaidTracks | OverlaidTracks[];

// Type guard for single track
export function isSingleTrack(track: TrackData): track is Track {
  return !Array.isArray(track) && !("tracks" in track);
}

// Type guard for track array
export function isTrackArray(track: TrackData): track is Track[] {
  return Array.isArray(track) && track.length > 0 && !("tracks" in track[0]);
}

// Type guard for overlaid tracks
export function isOverlaidTracks(track: TrackData): track is OverlaidTracks {
  return !Array.isArray(track) && "tracks" in track;
}

export interface TrackCategory {
  id: string;
  name: string;
  description?: string;
  tracks: TrackMetadata[];
}

export interface TrackMetadata {
  id: string;
  name: string;
  description?: string;
  category: TrackCategoryId;
  subcategory?: string;
  enabled: boolean;
  visible: boolean;
  track: TrackData;
  color: string;
  height: number;
  order: number;
  version: string;
  authors: string[];
  documentation: {
    overview: string;
    dataSource: string;
    methodology: string;
    interpretation: string;
    references: string[];
    lastUpdated: string;
  };
  performance: {
    renderTime: RenderTime;
    memoryUsage: MemoryUsage;
    dataSize: string;
  };
  interactions: {
    supportedViewTypes: ViewType[];
    linkingSupported: boolean;
    zoomBehavior: ZoomBehavior;
  };
  customization: {
    colorable: boolean;
    heightAdjustable: boolean;
    filtersAvailable: string[];
  };
}

export interface TrackFilter {
  categories: TrackCategoryId[];
  subcategories: string[];
  // tags: string[];
  search: string;
  showEnabled: boolean;
  showDisabled: boolean;
}

export interface GenomeBrowserState {
  tracks: TrackMetadata[];
  filters: TrackFilter;
  spec: GoslingSpec | null;
  viewport: {
    chromosome?: string;
    start?: number;
    end?: number;
  };
  loading: boolean;
  error?: string;
  performanceMode?: "fast" | "balanced" | "comprehensive";
}

export interface TrackRegistry {
  [key: string]: TrackMetadata;
}
