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
  source?: "reactome" | "wikipathways" | "kegg";
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
 * Phenotype entity
 */
export interface PhenotypeEntity extends BaseEntity {
  type: "Phenotype";
  definition?: string;
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
  | TraitEntity
  | PhenotypeEntity;

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
  "Phenotype",
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
  subtitle?: string;
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
 * Edge types in the knowledge graph - matching actual API schema
 */
export type EdgeType =
  // Gene relationships
  | "IMPLICATED_IN"           // Gene -> Disease
  | "CAUSES"                  // Gene -> Disease
  | "CURATED_FOR"             // Gene -> Disease
  | "PARTICIPATES_IN"         // Gene -> Pathway
  | "MANIFESTS_AS"            // Gene -> Phenotype
  | "ANNOTATED_IN"            // Gene -> Variant
  // Drug relationships
  | "TARGETS"                 // Drug -> Gene
  | "KNOWN_TO_TARGET"         // Drug -> Gene
  | "INTERACTS_WITH_GENE"     // Drug -> Gene
  | "APPROVED_FOR"            // Drug -> Disease
  | "INDICATED_FOR"           // Drug -> Disease
  | "INVESTIGATED_FOR"        // Drug -> Disease
  // Variant/GWAS relationships
  | "ASSOCIATED_WITH"         // Variant -> Trait
  | "REPORTED_IN"             // Variant -> Study
  | "AFFECTS_RESPONSE_TO"     // Variant -> Drug
  // Disease relationships
  | "PRESENTS_WITH"           // Disease -> Phenotype
  | "MAPS_TO"                 // Trait -> Disease
  // Pathway relationships
  | "PART_OF"                 // Pathway -> Pathway (child is part of parent)
  // NOTE: PATHWAY_CONTAINS may be the inverse of PART_OF or a separate edge type.
  // Verify with API schema endpoint: GET /api/v1/graph/schema
  // If not returned by API, consider removing this edge type.
  | "PATHWAY_CONTAINS";       // Pathway -> Pathway (parent contains child)

/**
 * All supported edge types with metadata
 */
export const EDGE_TYPE_CONFIG: Record<EdgeType, { label: string; color: string; description: string }> = {
  // Gene -> Disease (Orange/Red family)
  IMPLICATED_IN: {
    label: "Implicated In",
    color: "#f97316", // orange-500
    description: "Gene implicated in disease",
  },
  CAUSES: {
    label: "Causes",
    color: "#ef4444", // red-500
    description: "Gene causes disease",
  },
  CURATED_FOR: {
    label: "Curated For",
    color: "#dc2626", // red-600
    description: "Gene curated for disease association",
  },
  // Gene -> Pathway (Purple family)
  PARTICIPATES_IN: {
    label: "Participates In",
    color: "#8b5cf6", // violet-500
    description: "Gene participates in pathway",
  },
  // Gene -> Phenotype (Pink family)
  MANIFESTS_AS: {
    label: "Manifests As",
    color: "#ec4899", // pink-500
    description: "Gene manifests as phenotype",
  },
  // Gene -> Variant (Amber family)
  ANNOTATED_IN: {
    label: "Annotated In",
    color: "#f59e0b", // amber-500
    description: "Gene annotated in variant",
  },
  // Drug -> Gene (Green family)
  TARGETS: {
    label: "Targets",
    color: "#22c55e", // green-500
    description: "Drug targets gene",
  },
  KNOWN_TO_TARGET: {
    label: "Known to Target",
    color: "#16a34a", // green-600
    description: "Drug known to target gene",
  },
  INTERACTS_WITH_GENE: {
    label: "Interacts With Gene",
    color: "#15803d", // green-700
    description: "Drug interacts with gene",
  },
  // Drug -> Disease (Teal family)
  APPROVED_FOR: {
    label: "Approved For",
    color: "#14b8a6", // teal-500
    description: "Drug approved for disease",
  },
  INDICATED_FOR: {
    label: "Indicated For",
    color: "#0d9488", // teal-600
    description: "Drug indicated for disease",
  },
  INVESTIGATED_FOR: {
    label: "Investigated For",
    color: "#0f766e", // teal-700
    description: "Drug being investigated for disease",
  },
  // Variant relationships (Yellow family)
  ASSOCIATED_WITH: {
    label: "Associated With",
    color: "#eab308", // yellow-500
    description: "Variant associated with trait",
  },
  REPORTED_IN: {
    label: "Reported In",
    color: "#ca8a04", // yellow-600
    description: "Variant reported in study",
  },
  AFFECTS_RESPONSE_TO: {
    label: "Affects Response To",
    color: "#a16207", // yellow-700
    description: "Variant affects response to drug",
  },
  // Disease -> Phenotype (Rose family)
  PRESENTS_WITH: {
    label: "Presents With",
    color: "#f43f5e", // rose-500
    description: "Disease presents with phenotype",
  },
  // Trait -> Disease (Fuchsia family)
  MAPS_TO: {
    label: "Maps To",
    color: "#d946ef", // fuchsia-500
    description: "Trait maps to disease",
  },
  // Pathway relationships (Indigo family)
  PART_OF: {
    label: "Part Of",
    color: "#6366f1", // indigo-500
    description: "Pathway part of parent pathway",
  },
  PATHWAY_CONTAINS: {
    label: "Contains",
    color: "#4f46e5", // indigo-600
    description: "Pathway contains sub-pathway",
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
// Recipe System - Focus on Interesting Traversals (NOT PPI)
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
  /** Color theme */
  color: string;
}

/**
 * Predefined traversal recipes - Focus on biological insights, NOT PPI
 */
export const TRAVERSAL_RECIPES: TraversalRecipe[] = [
  {
    id: "gene-diseases",
    name: "Disease Associations",
    description: "Find all diseases this gene is implicated in",
    edgeTypes: ["IMPLICATED_IN", "CAUSES", "CURATED_FOR"],
    maxDepth: 1,
    nodeLimit: 100,
    startTypes: ["Gene"],
    icon: "heart-pulse",
    color: "#ef4444", // red
  },
  {
    id: "gene-pathways",
    name: "Pathway Membership",
    description: "Explore pathways this gene participates in",
    edgeTypes: ["PARTICIPATES_IN", "PART_OF"],
    maxDepth: 2,
    nodeLimit: 100,
    startTypes: ["Gene"],
    icon: "route",
    color: "#8b5cf6", // violet
  },
  {
    id: "gene-phenotypes",
    name: "Phenotype Manifestations",
    description: "See phenotypes this gene manifests as",
    edgeTypes: ["MANIFESTS_AS"],
    maxDepth: 1,
    nodeLimit: 50,
    startTypes: ["Gene"],
    icon: "activity",
    color: "#ec4899", // pink
  },
  {
    id: "disease-drugs",
    name: "Disease Treatments",
    description: "Find drugs approved/indicated for diseases",
    edgeTypes: ["IMPLICATED_IN", "APPROVED_FOR", "INDICATED_FOR", "INVESTIGATED_FOR"],
    maxDepth: 2,
    nodeLimit: 150,
    startTypes: ["Gene"],
    icon: "pill",
    color: "#14b8a6", // teal
  },
  {
    id: "drug-targets",
    name: "Drug Targets",
    description: "Find drugs that target this gene",
    edgeTypes: ["TARGETS", "KNOWN_TO_TARGET", "INTERACTS_WITH_GENE"],
    maxDepth: 1,
    nodeLimit: 50,
    startTypes: ["Gene"],
    icon: "target",
    color: "#22c55e", // green
  },
  {
    id: "disease-phenotypes",
    name: "Disease Phenotypes",
    description: "Explore disease presentations and phenotypes",
    edgeTypes: ["IMPLICATED_IN", "PRESENTS_WITH"],
    maxDepth: 2,
    nodeLimit: 100,
    startTypes: ["Gene"],
    icon: "clipboard-list",
    color: "#f43f5e", // rose
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
        concentric: (node: { data: (key: string) => unknown }) =>
          node.data("isSeed") ? 100 : 100 - (node.data("depth") as number || 1) * 20,
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
// Node Styling by Entity Type - Enhanced Color Coding
// =============================================================================

/**
 * Node colors by entity type - distinct and meaningful colors
 */
export const NODE_TYPE_COLORS: Record<EntityType, { background: string; border: string; text: string }> = {
  Gene: {
    background: "#dbeafe", // blue-100
    border: "#3b82f6",     // blue-500
    text: "#1e40af",       // blue-800
  },
  Disease: {
    background: "#fee2e2", // red-100
    border: "#ef4444",     // red-500
    text: "#991b1b",       // red-800
  },
  Drug: {
    background: "#d1fae5", // emerald-100
    border: "#10b981",     // emerald-500
    text: "#065f46",       // emerald-800
  },
  Pathway: {
    background: "#ede9fe", // violet-100
    border: "#8b5cf6",     // violet-500
    text: "#5b21b6",       // violet-800
  },
  Variant: {
    background: "#fef3c7", // amber-100
    border: "#f59e0b",     // amber-500
    text: "#92400e",       // amber-800
  },
  Trait: {
    background: "#fce7f3", // pink-100
    border: "#ec4899",     // pink-500
    text: "#9d174d",       // pink-800
  },
  Phenotype: {
    background: "#fae8ff", // fuchsia-100
    border: "#d946ef",     // fuchsia-500
    text: "#86198f",       // fuchsia-800
  },
};

/**
 * Seed node colors (distinct from regular nodes)
 */
export const SEED_NODE_COLORS = {
  background: "#6366f1", // indigo-500
  border: "#4338ca",     // indigo-700
  text: "#ffffff",
};

/**
 * Get node color by entity type (with seed override)
 */
export function getNodeColors(type: EntityType, isSeed: boolean): { background: string; border: string; text: string } {
  if (isSeed) {
    return SEED_NODE_COLORS;
  }
  return NODE_TYPE_COLORS[type] ?? { background: "#f1f5f9", border: "#64748b", text: "#334155" };
}

/**
 * Get node size based on entity type, seed status, and depth
 */
export function getNodeSize(type: EntityType, isSeed: boolean, depth: number): number {
  if (isSeed) return 52;
  // Nodes closer to seed are larger
  const baseSize = 36;
  const depthReduction = Math.min(depth, 3) * 4;
  return baseSize - depthReduction;
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
  if (!numSources || numSources <= 1) return 1.5;
  if (numSources <= 2) return 2;
  if (numSources <= 3) return 2.5;
  return 3;
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
  maxDepth: 4,
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
  /** Reset graph to seed only */
  onReset: () => void;
  /** Edge type counts for badges */
  edgeTypeCounts?: Record<EdgeType, number>;
  /** Node type counts for stats */
  nodeTypeCounts?: Record<EntityType, number>;
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
  const parts = edgeId.split("-");
  if (parts.length < 3) return null;
  const type = parts[0] as EdgeType;
  // Handle IDs that may contain dashes
  const rest = parts.slice(1).join("-");
  const lastDash = rest.lastIndexOf("-");
  if (lastDash === -1) return null;
  return {
    type,
    sourceId: rest.substring(0, lastDash),
    targetId: rest.substring(lastDash + 1),
  };
}

/**
 * Convert ExplorerNode to Cytoscape element data
 */
export function nodeToElementData(node: ExplorerNode): Record<string, unknown> {
  const colors = getNodeColors(node.type, node.isSeed);
  const size = getNodeSize(node.type, node.isSeed, node.depth);

  return {
    id: node.id,
    label: node.label,
    type: node.type,
    subtitle: node.subtitle,
    isSeed: node.isSeed,
    depth: node.depth,
    degree: node.degree,
    hubScore: node.hubScore,
    percentile: node.percentile,
    backgroundColor: colors.background,
    borderColor: colors.border,
    textColor: colors.text,
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
      classes: `edge-type edge-${edge.type.toLowerCase().replace(/_/g, "-")}`,
    });
  });

  return elements;
}

/**
 * Get summary of graph contents by type
 */
export function getGraphSummary(nodes: Map<string, ExplorerNode>, edges: Map<string, ExplorerEdge>): {
  nodeTypeCounts: Record<EntityType, number>;
  edgeTypeCounts: Record<EdgeType, number>;
} {
  const nodeTypeCounts: Record<EntityType, number> = {} as Record<EntityType, number>;
  const edgeTypeCounts: Record<EdgeType, number> = {} as Record<EdgeType, number>;

  nodes.forEach((node) => {
    nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] ?? 0) + 1;
  });

  edges.forEach((edge) => {
    edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] ?? 0) + 1;
  });

  return { nodeTypeCounts, edgeTypeCounts };
}
