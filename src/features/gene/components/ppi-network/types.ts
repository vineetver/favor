import type { ElementDefinition, LayoutOptions } from "cytoscape";

// =============================================================================
// Edge Filtering Types (Phase 1)
// =============================================================================

/**
 * Display mode for filtered edges
 * - "grey": Edges below threshold are greyed out but visible
 * - "hide": Edges below threshold are hidden
 * - "hide-cascade": Edges below threshold are hidden AND orphaned nodes are also hidden
 */
export type FilteredEdgeDisplay = "grey" | "hide" | "hide-cascade";

/**
 * Edge filter configuration
 */
export interface EdgeFilterConfig {
  minSources: number; // 0-4, default 0
  minExperiments: number; // 0+, default 0
  display: FilteredEdgeDisplay; // Replaces greyOutBelowThreshold
}

/**
 * Default edge filter configuration
 */
export const DEFAULT_EDGE_FILTER_CONFIG: EdgeFilterConfig = {
  minSources: 0,
  minExperiments: 0,
  display: "grey",
};

/**
 * Legacy edge filter state for backward compatibility
 * @deprecated Use EdgeFilterConfig instead
 */
export interface EdgeFilterState {
  minSources: number;        // 0-4, default 0
  minExperiments: number;    // 0+, default 0
  greyOutBelowThreshold: boolean;  // default true (grey out vs hide)
}

/**
 * Default edge filter state
 * @deprecated Use DEFAULT_EDGE_FILTER_CONFIG instead
 */
export const DEFAULT_EDGE_FILTER: EdgeFilterState = {
  minSources: 0,
  minExperiments: 0,
  greyOutBelowThreshold: true,
};

/**
 * Convert EdgeFilterConfig to legacy EdgeFilterState
 */
export function toEdgeFilterState(config: EdgeFilterConfig): EdgeFilterState {
  return {
    minSources: config.minSources,
    minExperiments: config.minExperiments,
    greyOutBelowThreshold: config.display === "grey",
  };
}

/**
 * Convert legacy EdgeFilterState to EdgeFilterConfig
 */
export function toEdgeFilterConfig(state: EdgeFilterState): EdgeFilterConfig {
  return {
    minSources: state.minSources,
    minExperiments: state.minExperiments,
    display: state.greyOutBelowThreshold ? "grey" : "hide",
  };
}

// =============================================================================
// Context Overlay Types (Phase 2)
// =============================================================================

/**
 * Type of context overlay for interactors
 */
export type ContextOverlay = 'none' | 'shared-pathways' | 'shared-diseases';

/**
 * Overlay data for a node showing shared context
 */
export interface OverlayData {
  nodeId: string;
  sharedCount: number;
  items: Array<{ id: string; name: string }>;
}

/**
 * Context overlay state (legacy)
 * @deprecated Use OverlayState discriminated union instead
 */
export interface ContextOverlayState {
  type: ContextOverlay;
  data: Map<string, OverlayData>;
  isLoading: boolean;
}

/**
 * Overlay state - discriminated union replacing 3 useState with 1
 * Makes invalid states unrepresentable
 */
export type OverlayState =
  | { status: "off" }
  | { status: "loading"; type: "pathways" | "diseases" }
  | { status: "loaded"; type: "pathways" | "diseases"; data: Map<string, OverlayData> }
  | { status: "error"; type: "pathways" | "diseases"; message: string };

/**
 * Context overlay options for dropdown
 */
export const CONTEXT_OVERLAY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "shared-pathways", label: "Shared Pathways" },
  { value: "shared-diseases", label: "Shared Diseases" },
] as const;

// =============================================================================
// Path Recipe Types (Phase 3)
// =============================================================================

/**
 * Available path finding recipes
 */
export type PathRecipe = 'ppi-only' | 'mechanism' | 'therapeutic';

/**
 * Path recipe configuration
 */
export interface PathRecipeConfig {
  label: string;
  description: string;
  edgeTypes: string[];
  nodeTypes: string[];
}

export const PATH_RECIPES: Record<PathRecipe, PathRecipeConfig> = {
  'ppi-only': {
    label: 'PPI Only',
    description: 'Protein-protein interactions only',
    edgeTypes: ['GENE_INTERACTS_WITH_GENE'],
    nodeTypes: ['Gene'],
  },
  'mechanism': {
    label: 'Mechanism',
    description: 'Include pathways and biological processes',
    edgeTypes: ['GENE_INTERACTS_WITH_GENE', 'GENE_PARTICIPATES_IN_PATHWAY', 'PATHWAY_PART_OF_PATHWAY'],
    nodeTypes: ['Gene', 'Pathway'],
  },
  'therapeutic': {
    label: 'Therapeutic',
    description: 'Find drug-mediated paths between genes',
    edgeTypes: ['DRUG_ACTS_ON_GENE', 'GENE_AFFECTS_DRUG_RESPONSE', 'DRUG_INDICATED_FOR_DISEASE'],
    nodeTypes: ['Gene', 'Drug', 'Disease'],
  },
};

// =============================================================================
// Clustering Types (Phase 4)
// =============================================================================

/**
 * Supported clustering algorithms
 */
export type ClusterAlgorithm = 'louvain' | 'label-propagation';

/**
 * Cluster state for community detection
 */
export interface ClusterState {
  enabled: boolean;
  algorithm: ClusterAlgorithm;
  clusters: Map<string, string[]>;  // clusterId -> nodeIds
  collapsedClusters: Set<string>;
}

/**
 * Default cluster state
 */
export const DEFAULT_CLUSTER_STATE: ClusterState = {
  enabled: false,
  algorithm: 'louvain',
  clusters: new Map(),
  collapsedClusters: new Set(),
};

// =============================================================================
// Hub Mode Types (Phase 5)
// =============================================================================

/**
 * Hub mode state for centrality-driven display
 */
export interface HubModeState {
  showHubsOnly: boolean;
  hubThreshold: number;  // percentile, e.g., 90 = top 10%
}

/**
 * Default hub mode state
 */
export const DEFAULT_HUB_MODE: HubModeState = {
  showHubsOnly: false,
  hubThreshold: 90,
};

// =============================================================================
// Feature Mode Types (Mutually Exclusive Features)
// =============================================================================

/**
 * Feature mode - Hub Focus and Clustering are mutually exclusive
 * This discriminated union ensures only one can be active at a time
 */
export type FeatureMode =
  | { type: "none" }
  | { type: "hubFocus"; threshold: number }
  | { type: "clustering"; algorithm: ClusterAlgorithm };

/**
 * Default feature mode
 */
export const DEFAULT_FEATURE_MODE: FeatureMode = { type: "none" };

/**
 * Helper to check if hub focus is active
 */
export function isHubFocusActive(mode: FeatureMode): mode is { type: "hubFocus"; threshold: number } {
  return mode.type === "hubFocus";
}

/**
 * Helper to check if clustering is active
 */
export function isClusteringActive(mode: FeatureMode): mode is { type: "clustering"; algorithm: ClusterAlgorithm } {
  return mode.type === "clustering";
}

// =============================================================================
// Core PPI Network Types
// =============================================================================

/**
 * A node in the PPI network graph
 */
export interface PPINode {
  id: string;
  label: string;
  isSeed: boolean;
  numSources: number | null;
  numExperiments: number | null;
  confidenceScores: number[];
  /** Hub score from centrality analysis (0-1) */
  hubScore?: number;
  /** Total degree from centrality analysis */
  degreeTotal?: number;
  /** Percentile ranking for total degree (0-100) */
  percentile?: number;
}

/**
 * Centrality data for a gene (Hub Spotlight)
 */
export interface CentralityData {
  entity: { type: string; id: string; label: string };
  degree: { in: number; out: number; total: number };
  percentile: { in: number; out: number; total: number };
  hubScore: number;
}

/**
 * Centrality fetch state - discriminated union to make invalid states unrepresentable
 */
export type CentralityState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: Map<string, CentralityData>; seedCentrality: CentralityData | null }
  | { status: "error"; error: string };

/**
 * Panel state - only one panel can be open at a time
 */
export type ActivePanel = "none" | "pathFinder" | "sharedInteractors";

/**
 * Selection state - mutually exclusive: either nothing, a node, or an edge is selected
 */
export type Selection =
  | { type: "none" }
  | { type: "node"; node: PPINode }
  | { type: "edge"; edgeId: string };

/**
 * Color mode for graph visualization
 */
export type ColorMode = "experiments" | "hub";

/**
 * Color mode options for the dropdown
 */
export const COLOR_MODE_OPTIONS = [
  { value: "experiments", label: "Experiments" },
  { value: "hub", label: "Hub Score" },
] as const;

/**
 * Evidence source for a PPI edge
 */
export interface PPIEvidenceSource {
  name: string;
  score?: number;
  experimentCount?: number;
}

/**
 * An edge in the PPI network representing a protein-protein interaction
 */
export interface PPIEdge {
  id: string;
  sourceId: string;
  sourceSymbol: string;
  targetId: string;
  targetSymbol: string;
  numSources: number | null;
  numExperiments: number | null;
  confidenceScores: number[];
  sources: PPIEvidenceSource[];
  detectionMethods?: string[];
  pubmedIds?: string[];
  /** Raw props from the API for the detail panel */
  _props?: Record<string, unknown>;
  /** Categorical confidence (low/medium/high/very_high) */
  _confidenceClass?: string | null;
  /** Interaction type (physical/functional_association) */
  _interactionType?: string | null;
}

/**
 * Selected edge with full provenance for the detail panel
 */
export interface PPIEdgeSelection {
  edge: PPIEdge;
  position: { x: number; y: number };
}

/**
 * Supported graph layout types
 */
export type LayoutType = "cose-bilkent" | "concentric" | "circle" | "grid";

/**
 * Layout configuration with display label
 */
export interface LayoutConfig {
  value: LayoutType;
  label: string;
}

/**
 * Layout options for each supported type
 */
export const LAYOUT_OPTIONS: LayoutConfig[] = [
  { value: "cose-bilkent", label: "Force-directed" },
  { value: "concentric", label: "Concentric" },
  { value: "circle", label: "Circle" },
  { value: "grid", label: "Grid" },
];

/**
 * Limit options for the number of interactions to display
 */
export const LIMIT_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

/**
 * Get Cytoscape layout options for a given layout type
 */
export function getLayoutOptions(type: LayoutType): LayoutOptions {
  switch (type) {
    case "cose-bilkent":
      // CoSE-Bilkent: Compound Spring Embedder layout
      // Best force-directed layout for both compound and non-compound graphs
      return {
        name: "cose-bilkent",
        animate: "end",
        animationDuration: 500,
        quality: "default",
        nodeDimensionsIncludeLabels: true,
        refresh: 30,
        fit: true,
        padding: 40,
        randomize: true,
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8,
        initialEnergyOnIncremental: 0.5,
      } as LayoutOptions;

    case "concentric":
      return {
        name: "concentric",
        animate: true,
        animationDuration: 500,
        concentric: (node: { data: (key: string) => boolean }) =>
          node.data("isSeed") ? 2 : 1,
        levelWidth: () => 1,
        minNodeSpacing: 50,
      } as LayoutOptions;

    case "circle":
      return {
        name: "circle",
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.5,
      } as LayoutOptions;

    case "grid":
      return {
        name: "grid",
        animate: true,
        animationDuration: 500,
        rows: undefined,
        cols: undefined,
        spacingFactor: 1.2,
      } as LayoutOptions;

    default:
      return { name: "cose-bilkent" } as LayoutOptions;
  }
}

/**
 * Path highlight state for Connectivity Bridge
 */
export interface PathHighlight {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

/**
 * Props for the PPI Cytoscape graph component
 */
export interface PPICytoscapeGraphProps {
  elements: ElementDefinition[];
  layout: LayoutType;
  seedGeneId?: string;
  onNodeClick?: (node: PPINode, event?: MouseEvent) => void;
  onNodeHover?: (node: PPINode | null, position: { x: number; y: number } | null) => void;
  onEdgeClick?: (edgeId: string, position: { x: number; y: number }) => void;
  selectedEdgeId?: string | null;
  /** Color mode for node visualization */
  colorMode?: ColorMode;
  /** Centrality data keyed by node ID */
  centralityData?: Map<string, CentralityData>;
  /** Path highlight state (when path mode is active) */
  pathHighlight?: PathHighlight | null;
  /** Selected gene IDs for multi-select (Shared Interactors) */
  selectedGeneIds?: Set<string>;
  /** Shared interactor node IDs to highlight */
  sharedInteractorIds?: Set<string>;
  /** Edge filter state for filtering/greying edges (legacy) */
  edgeFilter?: EdgeFilterState;
  /** Edge filter config with cascade support (new) */
  edgeFilterConfig?: EdgeFilterConfig;
  /** Context overlay data for node halos */
  overlayData?: Map<string, OverlayData>;
  /** Active context overlay type */
  overlayType?: ContextOverlay;
  /** Hub mode state for centrality filtering */
  hubMode?: HubModeState;
  /** Cluster state for community visualization */
  clusterState?: ClusterState;
  className?: string;
}

/**
 * Props for the PPI network view component
 */
export interface PPINetworkViewProps {
  seedGeneId: string;
  seedGeneSymbol: string;
  /** Subgraph nodes in EntityRef format (preferred) */
  subgraphNodes?: Array<{ type: string; id: string; label: string; subtitle?: string }>;
  /** Subgraph edges (TraverseEdge format from subgraph API with includeProps: true) */
  subgraphEdges?: Array<{
    type: string;
    direction: "out" | "in";
    from: { type: string; id: string; label: string; subtitle?: string };
    to: { type: string; id: string; label: string; subtitle?: string };
    props?: {
      sources?: string[];
      num_sources?: number;
      num_experiments?: number;
      confidence_scores?: number[];
      pubmed_ids?: string[];
      pmids?: string[];
      detection_methods?: string[];
      interaction_type?: string;
      [key: string]: unknown;
    };
    evidence?: {
      pubmedIds?: string[];
    };
  }>;
  /** Legacy edges format (fallback) */
  edges?: unknown;
  /** Legacy relations format (fallback) */
  relations?: unknown;
  className?: string;
}

/**
 * Props for the PPI node tooltip
 */
export interface PPINodeTooltipProps {
  node: PPINode | null;
  position: { x: number; y: number } | null;
}

/**
 * Experiment count thresholds for node coloring
 */
export const EXPERIMENT_THRESHOLDS = {
  HIGH: 51,    // 51+ experiments
  GOOD: 21,    // 21-50 experiments
  MODERATE: 6, // 6-20 experiments
  // 0-5 = low
} as const;

/**
 * Get experiment tier based on number of experiments
 */
export function getExperimentTier(numExperiments: number | null): "low" | "moderate" | "good" | "high" {
  if (numExperiments === null || numExperiments <= 5) return "low";
  if (numExperiments <= 20) return "moderate";
  if (numExperiments <= 50) return "good";
  return "high";
}
