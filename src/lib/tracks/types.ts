import type { GoslingSpec } from "gosling.js";
import type { Track, OverlaidTracks } from "@/components/gosling";

// Track category types for better type safety
export type TrackCategoryId =
  | "gene-annotation"
  | "integrative"
  | "clinical-significance"
  | "conservation"
  | "epigenetics"
  | "mappability"
  | "local-nucleotide-diversity"
  | "gwas"
  | "single-cell-tissue"
  | "other"
  | "tissue-specific";

export type RenderTime = "fast" | "medium" | "slow";
export type MemoryUsage = "low" | "medium" | "high";
export type ViewType = "linear" | "circular" | "overlay" | "stack";
export type ZoomBehavior = "adaptive" | "fixed" | "scalable";

// Union type for track data
export type TrackData = Track | Track[] | OverlaidTracks | OverlaidTracks[];

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
    colorLegend?: {
      title: string;
      description: string;
      categories: {
        label: string;
        color: string;
        description: string;
        biologicalMeaning?: string;
      }[];
    };
    visualElements?: {
      shapes?: {
        name: string;
        description: string;
        meaning: string;
      }[];
      patterns?: {
        name: string;
        description: string;
        meaning: string;
      }[];
      indicators?: {
        name: string;
        description: string;
        meaning: string;
      }[];
    };
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
