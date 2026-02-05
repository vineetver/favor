import type { ElementDefinition, LayoutOptions } from "cytoscape";

// =============================================================================
// Entity Types (Discriminated Union)
// =============================================================================

/**
 * Base entity properties shared by all entity types
 */
interface BaseEntity {
  id: string;
  label: string;
}

/**
 * Gene entity
 */
export interface GeneEntity extends BaseEntity {
  type: "Gene";
  symbol: string;
  ensemblId: string;
}

/**
 * Disease entity
 */
export interface DiseaseEntity extends BaseEntity {
  type: "Disease";
  mondoId?: string;
  orphanetId?: string;
}

/**
 * Drug entity
 */
export interface DrugEntity extends BaseEntity {
  type: "Drug";
  drugBankId?: string;
  chemblId?: string;
}

/**
 * Pathway entity
 */
export interface PathwayEntity extends BaseEntity {
  type: "Pathway";
  source: "reactome" | "wikipathways" | "kegg";
  category?: string;
}

/**
 * Variant entity
 */
export interface VariantEntity extends BaseEntity {
  type: "Variant";
  rsId?: string;
  chromosome?: string;
  position?: number;
}

/**
 * Trait entity (GWAS)
 */
export interface TraitEntity extends BaseEntity {
  type: "Trait";
  efoId?: string;
}

/**
 * Entity discriminated union - all supported entity types
 */
export type ExplorerEntity =
  | GeneEntity
  | DiseaseEntity
  | DrugEntity
  | PathwayEntity
  | VariantEntity
  | TraitEntity;

/**
 * Entity type string union
 */
export type EntityType = ExplorerEntity["type"];

/**
 * All supported entity types
 */
export const ENTITY_TYPES: EntityType[] = [
  "Gene",
  "Disease",
  "Drug",
  "Pathway",
  "Variant",
  "Trait",
];

// =============================================================================
// Node & Edge Types for Cytoscape
// =============================================================================

/**
 * Node in the explorer graph
 */
export interface ExplorerNode {
  id: string;
  type: EntityType;
  label: string;
  /** Original entity data */
  entity: ExplorerEntity;
  /** Whether this is a seed node (starting point) */
  isSeed: boolean;
  /** Depth from nearest seed node */
  depth: number;
  /** Number of edges connected to this node */
  degree?: number;
  /** Hub score from centrality analysis */
  hubScore?: number;
  /** Percentile ranking for degree */
  percentile?: number;
}

/**
 * Edge types in the knowledge graph
 */
export type EdgeType =
  | "INTERACTS_WITH"
  | "ASSOCIATED_WITH"
  | "IMPLICATED_IN"
  | "PARTICIPATES_IN"
  | "TARGETS"
  | "TREATS"
  | "PART_OF"
  | "GWAS_ASSOCIATED"
  | "HAS_VARIANT";

/**
 * All supported edge types with metadata
 */
export const EDGE_TYPE_CONFIG: Record<EdgeType, { label: string; color: string; sourceTypes: EntityType[]; targetTypes: EntityType[] }> = {
  INTERACTS_WITH: {
    label: "Interacts With",
    color: "#6366f1",
    sourceTypes: ["Gene"],
    targetTypes: ["Gene"],
  },
  ASSOCIATED_WITH: {
    label: "Associated With",
    color: "#ef4444",
    sourceTypes: ["Gene", "Pathway"],
    targetTypes: ["Disease", "Trait"],
  },
  IMPLICATED_IN: {
    label: "Implicated In",
    color: "#f97316",
    sourceTypes: ["Gene"],
    targetTypes: ["Disease"],
  },
  PARTICIPATES_IN: {
    label: "Participates In",
    color: "#8b5cf6",
    sourceTypes: ["Gene"],
    targetTypes: ["Pathway"],
  },
  TARGETS: {
    label: "Targets",
    color: "#22c55e",
    sourceTypes: ["Drug"],
    targetTypes: ["Gene"],
  },
  TREATS: {
    label: "Treats",
    color: "#14b8a6",
    sourceTypes: ["Drug"],
    targetTypes: ["Disease"],
  },
  PART_OF: {
    label: "Part Of",
    color: "#a855f7",
    sourceTypes: ["Pathway"],
    targetTypes: ["Pathway"],
  },
  GWAS_ASSOCIATED: {
    label: "GWAS Associated",
    color: "#eab308",
    sourceTypes: ["Variant"],
    targetTypes: ["Trait"],
  },
  HAS_VARIANT: {
    label: "Has Variant",
    color: "#f59e0b",
    sourceTypes: ["Gene"],
    targetTypes: ["Variant"],
  },
};

/**
 * Edge in the explorer graph
 */
export interface ExplorerEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  /** Number of supporting sources */
  numSources?: number;
  /** Number of experiments */
  numExperiments?: number;
  /** Confidence scores */
  confidenceScores?: number[];
  /** Evidence/provenance data */
  evidence?: {
    sources?: string[];
    pubmedIds?: string[];
    detectionMethods?: string[];
  };
}

// =============================================================================
// Selection State (Discriminated Union)
// =============================================================================

/**
 * Selection state - only one selection mode active at a time
 */
export type ExplorerSelection =
  | { type: "none" }
  | { type: "node"; nodeId: string; node: ExplorerNode }
  | { type: "edge"; edgeId: string; edge: ExplorerEdge }
  | { type: "multi"; nodeIds: Set<string> };

/**
 * Default selection state
 */
export const DEFAULT_SELECTION: ExplorerSelection = { type: "none" };

// =============================================================================
// Fetch State (Generic Discriminated Union)
// =============================================================================

/**
 * Generic fetch state for async operations
 * Makes loading/error/data states mutually exclusive
 */
export type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "error"; error: string };

/**
 * Create idle fetch state
 */
export function idleState<T>(): FetchState<T> {
  return { status: "idle" };
}

/**
 * Create loading fetch state
 */
export function loadingState<T>(): FetchState<T> {
  return { status: "loading" };
}

/**
 * Create loaded fetch state
 */
export function loadedState<T>(data: T): FetchState<T> {
  return { status: "loaded", data };
}

/**
 * Create error fetch state
 */
export function errorState<T>(error: string): FetchState<T> {
  return { status: "error", error };
}

// =============================================================================
// Graph Schema & Stats
// =============================================================================

/**
 * Edge type statistics in the schema
 */
export interface EdgeTypeStats {
  edgeType: EdgeType;
  count: number;
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
}

/**
 * Graph schema - describes available node/edge types
 */
export interface GraphSchema {
  nodeTypes: EntityType[];
  edgeTypes: EdgeTypeStats[];
  lastUpdated?: string;
}

/**
 * Global graph statistics
 */
export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeCounts: Record<EntityType, number>;
  edgeCounts: Record<EdgeType, number>;
}

// =============================================================================
// Recipe System
// =============================================================================

/**
 * Traversal recipe for one-click exploration
 */
export interface TraversalRecipe {
  id: string;
  name: string;
  description: string;
  /** Edge types to traverse */
  edgeTypes: EdgeType[];
  /** Maximum depth for traversal */
  maxDepth: number;
  /** Node limit */
  nodeLimit: number;
  /** Starting entity types */
  startTypes: EntityType[];
  /** Icon name (lucide-react) */
  icon: string;
}

/**
 * Predefined traversal recipes
 */
export const TRAVERSAL_RECIPES: TraversalRecipe[] = [
  {
    id: "gene-diseases",
    name: "Gene → Diseases",
    description: "Find diseases associated with this gene",
    edgeTypes: ["ASSOCIATED_WITH", "IMPLICATED_IN"],
    maxDepth: 1,
    nodeLimit: 50,
    startTypes: ["Gene"],
    icon: "heart-pulse",
  },
  {
    id: "gene-diseases-drugs",
    name: "Gene → Diseases → Drugs",
    description: "Find drugs that treat diseases associated with this gene",
    edgeTypes: ["ASSOCIATED_WITH", "IMPLICATED_IN", "TREATS", "TARGETS"],
    maxDepth: 2,
    nodeLimit: 100,
    startTypes: ["Gene"],
    icon: "pill",
  },
  {
    id: "gene-pathways-genes",
    name: "Gene → Pathways → Genes",
    description: "Find genes in shared pathways",
    edgeTypes: ["PARTICIPATES_IN"],
    maxDepth: 2,
    nodeLimit: 100,
    startTypes: ["Gene"],
    icon: "route",
  },
  {
    id: "ppi-neighborhood",
    name: "PPI Neighborhood",
    description: "Explore protein-protein interactions",
    edgeTypes: ["INTERACTS_WITH"],
    maxDepth: 1,
    nodeLimit: 50,
    startTypes: ["Gene"],
    icon: "network",
  },
  {
    id: "variant-trait-disease",
    name: "Variant → Trait → Disease",
    description: "Trace variant associations through GWAS traits",
    edgeTypes: ["GWAS_ASSOCIATED", "ASSOCIATED_WITH"],
    maxDepth: 2,
    nodeLimit: 50,
    startTypes: ["Variant"],
    icon: "dna",
  },
];

// =============================================================================
// View & Panel State
// =============================================================================

/**
 * Main view mode for the explorer
 */
export type ViewMode = "graph" | "list" | "split";

/**
 * Active panel in the UI (mutually exclusive)
 */
export type ActivePanel =
  | "none"
  | "inspector"
  | "pathFinder"
  | "intersection"
  | "settings";

/**
 * Layout options for the graph
 */
export type ExplorerLayoutType = "cose-bilkent" | "dagre" | "circle" | "concentric" | "grid";

/**
 * Layout configurations
 */
export const EXPLORER_LAYOUT_OPTIONS: Array<{ value: ExplorerLayoutType; label: string }> = [
  { value: "cose-bilkent", label: "Force-Directed" },
  { value: "dagre", label: "Hierarchical" },
  { value: "concentric", label: "Concentric" },
  { value: "circle", label: "Circle" },
  { value: "grid", label: "Grid" },
];

/**
 * Get Cytoscape layout options for a given layout type
 */
export function getExplorerLayoutOptions(type: ExplorerLayoutType): LayoutOptions {
  switch (type) {
    case "cose-bilkent":
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

    case "dagre":
      return {
        name: "dagre",
        animate: true,
        animationDuration: 500,
        rankDir: "TB",
        nodeSep: 50,
        rankSep: 80,
        edgeSep: 10,
        fit: true,
        padding: 40,
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
        fit: true,
        padding: 40,
      } as LayoutOptions;

    case "circle":
      return {
        name: "circle",
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.5,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    case "grid":
      return {
        name: "grid",
        animate: true,
        animationDuration: 500,
        rows: undefined,
        cols: undefined,
        spacingFactor: 1.2,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    default:
      return { name: "cose-bilkent" } as LayoutOptions;
  }
}

// =============================================================================
// Node Styling by Entity Type
// =============================================================================

/**
 * Node colors by entity type
 */
export const NODE_TYPE_COLORS: Record<EntityType, { background: string; border: string }> = {
  Gene: { background: "#dbeafe", border: "#3b82f6" },
  Disease: { background: "#fecaca", border: "#ef4444" },
  Drug: { background: "#d9f99d", border: "#84cc16" },
  Pathway: { background: "#e0e7ff", border: "#6366f1" },
  Variant: { background: "#fef3c7", border: "#f59e0b" },
  Trait: { background: "#fce7f3", border: "#ec4899" },
};

/**
 * Get node color by entity type (with seed override)
 */
export function getNodeColors(type: EntityType, isSeed: boolean): { background: string; border: string } {
  if (isSeed) {
    return { background: "#6366f1", border: "#4f46e5" }; // Indigo for seed
  }
  return NODE_TYPE_COLORS[type] ?? { background: "#e2e8f0", border: "#94a3b8" };
}

/**
 * Get node size based on entity type and seed status
 */
export function getNodeSize(type: EntityType, isSeed: boolean): number {
  if (isSeed) return 48;
  return 36;
}

// =============================================================================
// Edge Styling
// =============================================================================

/**
 * Get edge color by type
 */
export function getEdgeColor(type: EdgeType): string {
  return EDGE_TYPE_CONFIG[type]?.color ?? "#94a3b8";
}

/**
 * Get edge width based on evidence strength
 */
export function getEdgeWidth(numSources: number | undefined): number {
  if (!numSources || numSources <= 1) return 1;
  if (numSources <= 2) return 2;
  if (numSources <= 3) return 3;
  return 4;
}

// =============================================================================
// Graph State
// =============================================================================

/**
 * Filter configuration for the graph
 */
export interface GraphFilters {
  /** Active edge types to show */
  edgeTypes: Set<EdgeType>;
  /** Minimum sources filter */
  minSources: number;
  /** Minimum experiments filter */
  minExperiments: number;
  /** Maximum depth from seed */
  maxDepth: number;
  /** Show orphan nodes (nodes with no visible edges) */
  showOrphans: boolean;
}

/**
 * Default filter configuration
 */
export const DEFAULT_FILTERS: GraphFilters = {
  edgeTypes: new Set(Object.keys(EDGE_TYPE_CONFIG) as EdgeType[]),
  minSources: 0,
  minExperiments: 0,
  maxDepth: 3,
  showOrphans: true,
};

/**
 * Graph explorer state
 */
export interface ExplorerState {
  /** All nodes in the graph */
  nodes: Map<string, ExplorerNode>;
  /** All edges in the graph */
  edges: Map<string, ExplorerEdge>;
  /** Seed node IDs */
  seeds: Set<string>;
  /** Current selection */
  selection: ExplorerSelection;
  /** Active filters */
  filters: GraphFilters;
  /** Current layout */
  layout: ExplorerLayoutType;
  /** View mode */
  viewMode: ViewMode;
  /** Active panel */
  activePanel: ActivePanel;
  /** Expansion state for async loading */
  expansion: FetchState<null>;
}

/**
 * Default explorer state
 */
export function createDefaultExplorerState(): ExplorerState {
  return {
    nodes: new Map(),
    edges: new Map(),
    seeds: new Set(),
    selection: DEFAULT_SELECTION,
    filters: { ...DEFAULT_FILTERS, edgeTypes: new Set(DEFAULT_FILTERS.edgeTypes) },
    layout: "cose-bilkent",
    viewMode: "graph",
    activePanel: "none",
    expansion: { status: "idle" },
  };
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the main GraphExplorerView component
 */
export interface GraphExplorerViewProps {
  /** Seed gene ID */
  seedGeneId: string;
  /** Seed gene symbol */
  seedGeneSymbol: string;
  /** Graph schema (optional, for edge type discovery) */
  schema?: GraphSchema | null;
  /** Graph stats (optional, for count badges) */
  stats?: GraphStats | null;
  className?: string;
}

/**
 * Props for the ExplorerCytoscape component
 */
export interface ExplorerCytoscapeProps {
  /** Cytoscape elements */
  elements: ElementDefinition[];
  /** Current layout */
  layout: ExplorerLayoutType;
  /** Node click handler */
  onNodeClick?: (node: ExplorerNode, event?: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: ExplorerNode | null, position: { x: number; y: number } | null) => void;
  /** Edge click handler */
  onEdgeClick?: (edge: ExplorerEdge, position: { x: number; y: number }) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Selected node IDs for highlighting */
  selectedNodeIds?: Set<string>;
  /** Selected edge ID for highlighting */
  selectedEdgeId?: string | null;
  /** Path highlight (node and edge IDs) */
  pathHighlight?: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
  className?: string;
}

/**
 * Props for the ControlsDrawer component
 */
export interface ControlsDrawerProps {
  /** Whether drawer is open */
  open: boolean;
  /** Toggle drawer */
  onOpenChange: (open: boolean) => void;
  /** Current filters */
  filters: GraphFilters;
  /** Update filters */
  onFiltersChange: (filters: GraphFilters) => void;
  /** Current layout */
  layout: ExplorerLayoutType;
  /** Change layout */
  onLayoutChange: (layout: ExplorerLayoutType) => void;
  /** Apply recipe */
  onApplyRecipe: (recipe: TraversalRecipe) => void;
  /** Edge type counts for badges */
  edgeTypeCounts?: Record<EdgeType, number>;
  /** Whether expansion is loading */
  isExpanding: boolean;
}

/**
 * Props for the InspectorPanel component
 */
export interface InspectorPanelProps {
  /** Current selection */
  selection: ExplorerSelection;
  /** Get node by ID */
  getNode: (id: string) => ExplorerNode | undefined;
  /** Get edge by ID */
  getEdge: (id: string) => ExplorerEdge | undefined;
  /** Expand node (load neighbors) */
  onExpandNode: (nodeId: string, edgeTypes?: EdgeType[]) => void;
  /** Remove node from graph */
  onRemoveNode: (nodeId: string) => void;
  /** Find paths to another node */
  onFindPaths: (fromId: string, toId: string) => void;
  /** Close panel */
  onClose: () => void;
  /** Whether expansion is loading */
  isExpanding: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a unique edge ID from source and target
 */
export function createEdgeId(type: EdgeType, sourceId: string, targetId: string): string {
  return `${type}-${sourceId}-${targetId}`;
}

/**
 * Parse edge ID back to components
 */
export function parseEdgeId(edgeId: string): { type: EdgeType; sourceId: string; targetId: string } | null {
  const match = edgeId.match(/^([A-Z_]+)-(.+)-(.+)$/);
  if (!match) return null;
  return {
    type: match[1] as EdgeType,
    sourceId: match[2],
    targetId: match[3],
  };
}

/**
 * Convert ExplorerNode to Cytoscape element data
 */
export function nodeToElementData(node: ExplorerNode): Record<string, unknown> {
  const colors = getNodeColors(node.type, node.isSeed);
  const size = getNodeSize(node.type, node.isSeed);

  return {
    id: node.id,
    label: node.label,
    type: node.type,
    isSeed: node.isSeed,
    depth: node.depth,
    degree: node.degree,
    hubScore: node.hubScore,
    percentile: node.percentile,
    backgroundColor: colors.background,
    borderColor: colors.border,
    nodeSize: size,
  };
}

/**
 * Convert ExplorerEdge to Cytoscape element data
 */
export function edgeToElementData(edge: ExplorerEdge): Record<string, unknown> {
  const color = getEdgeColor(edge.type);
  const width = getEdgeWidth(edge.numSources);

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: edge.type,
    numSources: edge.numSources,
    numExperiments: edge.numExperiments,
    lineColor: color,
    edgeWidth: width,
  };
}

/**
 * Transform explorer nodes and edges to Cytoscape elements
 */
export function transformToElements(
  nodes: Map<string, ExplorerNode>,
  edges: Map<string, ExplorerEdge>,
  filters: GraphFilters,
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const visibleNodeIds = new Set<string>();

  // First pass: identify visible edges and their connected nodes
  edges.forEach((edge) => {
    // Check if edge type is active
    if (!filters.edgeTypes.has(edge.type)) return;

    // Check minimum sources/experiments
    if ((edge.numSources ?? 0) < filters.minSources) return;
    if ((edge.numExperiments ?? 0) < filters.minExperiments) return;

    visibleNodeIds.add(edge.sourceId);
    visibleNodeIds.add(edge.targetId);
  });

  // Add nodes
  nodes.forEach((node) => {
    // Check depth filter
    if (node.depth > filters.maxDepth) return;

    // Check orphan visibility
    if (!filters.showOrphans && !visibleNodeIds.has(node.id) && !node.isSeed) return;

    elements.push({
      data: nodeToElementData(node),
      classes: `entity-${node.type.toLowerCase()}${node.isSeed ? " seed" : ""}`,
    });
  });

  // Add visible edges
  edges.forEach((edge) => {
    if (!filters.edgeTypes.has(edge.type)) return;
    if ((edge.numSources ?? 0) < filters.minSources) return;
    if ((edge.numExperiments ?? 0) < filters.minExperiments) return;

    // Only add edge if both nodes are in the graph
    const sourceNode = nodes.get(edge.sourceId);
    const targetNode = nodes.get(edge.targetId);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.depth > filters.maxDepth || targetNode.depth > filters.maxDepth) return;

    elements.push({
      data: edgeToElementData(edge),
      classes: `edge-${edge.type.toLowerCase().replace(/_/g, "-")}`,
    });
  });

  return elements;
}
