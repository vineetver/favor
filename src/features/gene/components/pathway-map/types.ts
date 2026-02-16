import type { ElementDefinition, LayoutOptions } from "cytoscape";

// =============================================================================
// Core Domain Types
// =============================================================================

export type PathwaySource = string;

/**
 * A pathway node derived from graph
 */
export interface PathwayNode {
  id: string;
  name: string;
  category: string;
  url: string;
  source: PathwaySource;
  /** Evidence metadata from PARTICIPATES_IN edge */
  numSources?: number;
  numExperiments?: number;
  confidenceScore?: number;
}

/**
 * A hierarchy edge (Pathway -> Pathway via PART_OF)
 */
export interface PathwayHierarchyEdge {
  parentId: string;
  childId: string;
}

/**
 * Pathway data grouped by category
 */
export interface PathwayCategory {
  name: string;
  pathways: PathwayNode[];
  count: number;
}

/**
 * Hierarchical category with nested subcategories
 */
export interface HierarchicalCategory {
  name: string;
  pathways: PathwayNode[];
  subcategories: HierarchicalCategory[];
  count: number; // total pathways including subcategories
  isExpanded?: boolean;
}

// =============================================================================
// Graph Node Types - Discriminated Union
// =============================================================================

export type GraphNode =
  | { type: "gene"; id: string; label: string }
  | { type: "pathway"; data: PathwayNode };

// =============================================================================
// Sort Configuration
// =============================================================================

export type PathwaySortOption = "relevance" | "name" | "category";

export const PATHWAY_SORT_OPTIONS: Array<{
  value: PathwaySortOption;
  label: string;
}> = [
  { value: "relevance", label: "Evidence (default)" },
  { value: "name", label: "Name (A-Z)" },
  { value: "category", label: "Category" },
];

// =============================================================================
// Expansion Level Configuration
// =============================================================================

export type ExpansionLevel = "compact" | "standard" | "detailed";

export const EXPANSION_LEVEL_OPTIONS: Array<{
  value: ExpansionLevel;
  label: string;
}> = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

/**
 * Configuration derived from expansion level
 */
export interface ExpansionConfig {
  nodeLimit: number;
  showHierarchy: boolean;
  autoLoadDiseases: boolean;
}

export function getExpansionConfig(level: ExpansionLevel): ExpansionConfig {
  switch (level) {
    case "compact":
      return {
        nodeLimit: 25,
        showHierarchy: false,
        autoLoadDiseases: false,
      };
    case "standard":
      return {
        nodeLimit: 50,
        showHierarchy: true,
        autoLoadDiseases: false,
      };
    case "detailed":
      return {
        nodeLimit: 100,
        showHierarchy: true,
        autoLoadDiseases: true,
      };
  }
}

// =============================================================================
// Limit Configuration
// =============================================================================

/**
 * Limit options for number of pathways to display
 */
export const PATHWAY_LIMIT_OPTIONS = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "all", label: "All" },
];

// =============================================================================
// Layout Configuration
// =============================================================================

export type PathwayLayoutType = "cose-bilkent" | "dagre-tb" | "dagre-lr";

export const PATHWAY_LAYOUT_OPTIONS: Array<{
  value: PathwayLayoutType;
  label: string;
}> = [
  { value: "cose-bilkent", label: "Force-directed" },
  { value: "dagre-tb", label: "Tree (top-down)" },
  { value: "dagre-lr", label: "Tree (left-right)" },
];

export function getPathwayLayoutOptions(
  type: PathwayLayoutType,
): LayoutOptions {
  switch (type) {
    case "cose-bilkent":
      return {
        name: "cose-bilkent",
        animate: "end",
        animationDuration: 400,
        quality: "default",
        nodeDimensionsIncludeLabels: true,
        fit: true,
        padding: 50,
        randomize: true,
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
      } as LayoutOptions;

    case "dagre-tb":
      return {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 50,
        rankSep: 80,
        ranker: "tight-tree",
        animate: true,
        animationDuration: 400,
        fit: true,
        padding: 50,
      } as LayoutOptions;

    case "dagre-lr":
      return {
        name: "dagre",
        rankDir: "LR",
        nodeSep: 40,
        rankSep: 100,
        ranker: "tight-tree",
        animate: true,
        animationDuration: 400,
        fit: true,
        padding: 50,
      } as LayoutOptions;
  }
}

// =============================================================================
// Category Colors
// =============================================================================

type CategoryColor = { bg: string; border: string; text: string };

/**
 * Semantic color overrides — common pathway categories get meaningful colors.
 * Key matching is case-insensitive and prefix-matched.
 */
const SEMANTIC_COLORS: Array<{ match: string; color: CategoryColor }> = [
  { match: "disease", color: { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" } },           // red
  { match: "immune", color: { bg: "#d1fae5", border: "#10b981", text: "#065f46" } },             // emerald
  { match: "signal transduction", color: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" } }, // blue
  { match: "cell cycle", color: { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" } },          // pink
  { match: "dna repair", color: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" } },          // amber
  { match: "dna replication", color: { bg: "#fed7aa", border: "#f97316", text: "#9a3412" } },     // orange
  { match: "metabolism", color: { bg: "#fef08a", border: "#facc15", text: "#854d0e" } },           // yellow
  { match: "gene expression", color: { bg: "#d9f99d", border: "#84cc16", text: "#3f6212" } },     // lime
  { match: "developmental", color: { bg: "#ccfbf1", border: "#14b8a6", text: "#115e59" } },       // teal
  { match: "hemostasis", color: { bg: "#fda4af", border: "#fb7185", text: "#be123c" } },           // rose
  { match: "neuronal", color: { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8" } },            // purple
  { match: "chromatin", color: { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" } },           // indigo
  { match: "transport", color: { bg: "#bae6fd", border: "#0ea5e9", text: "#075985" } },           // sky
  { match: "autophagy", color: { bg: "#67e8f9", border: "#06b6d4", text: "#0e7490" } },           // cyan
  { match: "muscle", color: { bg: "#c4b5fd", border: "#8b5cf6", text: "#5b21b6" } },              // violet
  { match: "protein", color: { bg: "#fdba74", border: "#fb923c", text: "#9a3412" } },             // tangerine
  { match: "reproduction", color: { bg: "#f0abfc", border: "#d946ef", text: "#86198f" } },        // fuchsia
  { match: "sensory", color: { bg: "#86efac", border: "#22c55e", text: "#166534" } },              // green
  { match: "extracellular", color: { bg: "#a5f3fc", border: "#22d3ee", text: "#0891b2" } },       // aqua
  { match: "circadian", color: { bg: "#c7d2fe", border: "#818cf8", text: "#4338ca" } },           // periwinkle
];

const OTHER_COLOR: CategoryColor = { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" };

/** Fallback palette for categories that don't match any semantic rule */
const FALLBACK_PALETTE: CategoryColor[] = [
  { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" },
  { bg: "#ccfbf1", border: "#14b8a6", text: "#115e59" },
  { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  { bg: "#d9f99d", border: "#84cc16", text: "#3f6212" },
  { bg: "#fed7aa", border: "#f97316", text: "#9a3412" },
  { bg: "#bae6fd", border: "#0ea5e9", text: "#075985" },
  { bg: "#c4b5fd", border: "#8b5cf6", text: "#5b21b6" },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const colorCache = new Map<string, CategoryColor>();

export function getCategoryColor(category: string): CategoryColor {
  const cached = colorCache.get(category);
  if (cached) return cached;

  // "Other" / "Uncategorized" always get neutral
  const lower = category.toLowerCase();
  if (lower === "other" || lower === "uncategorized") {
    colorCache.set(category, OTHER_COLOR);
    return OTHER_COLOR;
  }

  // Try semantic prefix match
  for (const { match, color } of SEMANTIC_COLORS) {
    if (lower.startsWith(match) || lower.includes(match)) {
      colorCache.set(category, color);
      return color;
    }
  }

  // Deterministic fallback via hash
  const color =
    FALLBACK_PALETTE[hashString(category) % FALLBACK_PALETTE.length];
  colorCache.set(category, color);
  return color;
}

// =============================================================================
// Enrichment Types
// =============================================================================

/**
 * Enriched pathway with additional context from API
 */
export interface EnrichedPathwayData {
  geneCount: number;
  sharedGenes: Array<{ id: string; symbol: string }>;
  relatedDiseases: Array<{ id: string; name: string }>;
  parentPathway: { id: string; name: string } | null;
  childPathways: Array<{ id: string; name: string }>;
}

/**
 * Enrichment fetch state - discriminated union
 */
export type EnrichmentState =
  | { status: "idle" }
  | { status: "loading"; pathwayId: string }
  | { status: "loaded"; pathwayId: string; data: EnrichedPathwayData }
  | { status: "error"; pathwayId: string; error: string };

// =============================================================================
// Filter State Types
// =============================================================================

/**
 * Category filter state for sidebar
 */
export interface CategoryFilterState {
  selectedCategories: Set<string>; // categories in this set are HIDDEN; empty = all visible
  hiddenPathwayIds: Set<string>; // individual pathways in this set are HIDDEN
  showHierarchy: boolean;
}

/**
 * Selection state - discriminated union
 */
export type PathwaySelection =
  | { type: "none" }
  | { type: "pathway"; pathway: PathwayNode };

// =============================================================================
// Component Props
// =============================================================================

export interface PathwayLeverageViewProps {
  seedGeneId: string;
  seedGeneSymbol: string;
  /** Pathways derived from graph (single source of truth) */
  pathways: PathwayNode[];
  /** Hierarchy edges from PART_OF relationships */
  hierarchyEdges: PathwayHierarchyEdge[];
}

export interface PathwayCategorySidebarProps {
  categories: PathwayCategory[];
  hierarchyEdges: PathwayHierarchyEdge[];
  pathways: PathwayNode[];
  filterState: CategoryFilterState;
  onFilterChange: (state: CategoryFilterState) => void;
  className?: string;
}

/**
 * Disease enrichment fetch state - discriminated union
 */
export type DiseaseEnrichmentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: { totalDiseases: number; diseases: Array<{ disease: { id: string; name: string }; geneCount: number; genes: Array<{ id: string; symbol: string }> }> } }
  | { status: "error"; error: string };

export interface PathwayDetailPanelProps {
  pathway: PathwayNode | null;
  enrichment: EnrichmentState;
  diseaseEnrichment: DiseaseEnrichmentState;
  seedGeneSymbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadDiseases: () => void;
}

export interface PathwayCytoscapeGraphProps {
  elements: ElementDefinition[];
  layout: PathwayLayoutType;
  selectedNodeId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (
    node: PathwayNode | null,
    position: { x: number; y: number } | null,
  ) => void;
}

// =============================================================================
// Parsing Functions
// =============================================================================

function inferPathwaySource(pathwayId: string): PathwaySource {
  if (pathwayId.startsWith("R-HSA-") || pathwayId.startsWith("R-"))
    return "Reactome";
  if (pathwayId.startsWith("WP")) return "WikiPathways";
  if (pathwayId.startsWith("hsa") || pathwayId.startsWith("map"))
    return "KEGG";
  if (pathwayId.startsWith("SMP")) return "SMPDB";
  return "ConsensusPathDB";
}

function getPathwayUrl(pathwayId: string, source: PathwaySource): string {
  switch (source.toLowerCase()) {
    case "reactome":
      return `https://reactome.org/content/detail/${pathwayId}`;
    case "wikipathways": {
      const wpId = pathwayId.replace("WP:", "");
      return `https://www.wikipathways.org/pathways/${wpId}`;
    }
    case "kegg":
      return `https://www.genome.jp/pathway/${pathwayId}`;
    case "smpdb":
      return `https://smpdb.ca/view/${pathwayId}`;
    default:
      return "";
  }
}

/**
 * Edge props from PARTICIPATES_IN relationship for evidence metadata
 */
export interface PathwayEdgeProps {
  numSources?: number;
  numExperiments?: number;
  confidenceScores?: number[];
}

/**
 * Parse pathway from graph node.
 * Accepts optional API-provided fields for category and source.
 */
export function parsePathwayFromNode(
  node: {
    id: string;
    label: string;
    subtitle?: string;
  },
  edgeProps?: PathwayEdgeProps,
  apiFields?: { category?: string; source?: string },
): PathwayNode {
  const source =
    apiFields?.source || node.subtitle || inferPathwaySource(node.id);
  const category = apiFields?.category || source;

  // Calculate confidence score from array if available
  const confidenceScore = edgeProps?.confidenceScores?.length
    ? Math.max(...edgeProps.confidenceScores)
    : undefined;

  return {
    id: node.id,
    name: node.label,
    category,
    url: getPathwayUrl(node.id, source),
    source,
    numSources: edgeProps?.numSources,
    numExperiments: edgeProps?.numExperiments,
    confidenceScore,
  };
}

/**
 * Group pathways by category, sorted by count descending
 */
export function groupPathwaysByCategory(
  pathways: PathwayNode[],
): PathwayCategory[] {
  const groups = new Map<string, PathwayNode[]>();

  for (const pathway of pathways) {
    const existing = groups.get(pathway.category);
    if (existing) {
      existing.push(pathway);
    } else {
      groups.set(pathway.category, [pathway]);
    }
  }

  return Array.from(groups.entries())
    .map(([name, list]) => ({
      name,
      pathways: list.sort((a, b) => a.name.localeCompare(b.name)),
      count: list.length,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Build hierarchical categories from pathways and hierarchy edges.
 * Groups pathways by category but also nests sub-pathways under their parents.
 */
export function buildHierarchicalCategories(
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[],
): HierarchicalCategory[] {
  // Build child -> parent map
  const childToParent = new Map<string, string>();
  for (const edge of hierarchyEdges) {
    childToParent.set(edge.childId, edge.parentId);
  }

  // Build parent -> children map
  const parentToChildren = new Map<string, Set<string>>();
  for (const edge of hierarchyEdges) {
    if (!parentToChildren.has(edge.parentId)) {
      parentToChildren.set(edge.parentId, new Set());
    }
    parentToChildren.get(edge.parentId)!.add(edge.childId);
  }

  // Create pathway lookup
  const pathwayMap = new Map<string, PathwayNode>();
  for (const p of pathways) {
    pathwayMap.set(p.id, p);
  }

  // Find root pathways (no parent in our set of pathways)
  const pathwayIds = new Set(pathways.map((p) => p.id));
  const rootPathways = pathways.filter((p) => {
    const parentId = childToParent.get(p.id);
    return !parentId || !pathwayIds.has(parentId);
  });

  // Build hierarchy recursively
  function buildSubtree(pathway: PathwayNode): HierarchicalCategory {
    const childIds = parentToChildren.get(pathway.id) ?? new Set();
    const childPathways = Array.from(childIds)
      .map((id) => pathwayMap.get(id))
      .filter((p): p is PathwayNode => p !== undefined);

    const subcategories = childPathways
      .map(buildSubtree)
      .sort((a, b) => b.count - a.count);

    const directCount = 1; // The pathway itself
    const totalCount =
      directCount + subcategories.reduce((sum, sub) => sum + sub.count, 0);

    return {
      name: pathway.name,
      pathways: [pathway],
      subcategories,
      count: totalCount,
    };
  }

  // Group root pathways by category
  const categoryGroups = new Map<string, PathwayNode[]>();
  for (const pathway of rootPathways) {
    const existing = categoryGroups.get(pathway.category);
    if (existing) {
      existing.push(pathway);
    } else {
      categoryGroups.set(pathway.category, [pathway]);
    }
  }

  // Build hierarchical categories
  return Array.from(categoryGroups.entries())
    .map(([categoryName, catPathways]) => {
      const subcategories = catPathways
        .map(buildSubtree)
        .sort((a, b) => b.count - a.count);

      const totalCount = subcategories.reduce((sum, sub) => sum + sub.count, 0);

      return {
        name: categoryName,
        pathways: [], // Category has no direct pathways, only subcategories
        subcategories,
        count: totalCount,
      };
    })
    .sort((a, b) => b.count - a.count);
}
