import type { ElementDefinition } from "cytoscape";
import {
  type CategoryFilterState,
  getCategoryColor,
  type PathwayHierarchyEdge,
  type PathwayNode,
} from "../components/pathway-map/types";

/**
 * Options for building Cytoscape elements
 */
export interface BuildCytoscapeElementsOptions {
  filterState?: CategoryFilterState;
}

/**
 * Transform pathway data to Cytoscape elements.
 * Gene node in center, pathway nodes around it with edges.
 * Supports category filtering and hierarchy display options.
 */
export function buildCytoscapeElements(
  seedGene: { id: string; symbol: string },
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[] = [],
  options?: BuildCytoscapeElementsOptions,
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const filterState = options?.filterState;

  // Filter pathways by category if filter is active
  const filteredPathways = filterPathwaysByCategory(pathways, filterState);

  // Add seed gene node (center)
  elements.push({
    data: {
      id: seedGene.id,
      label: seedGene.symbol,
      type: "gene",
      isGene: true,
      nodeSize: 56,
    },
  });

  // Build depth map from hierarchy
  const depthMap = buildDepthMap(filteredPathways, hierarchyEdges);

  // Add pathway nodes
  for (const pathway of filteredPathways) {
    const colors = getCategoryColor(pathway.category);
    const depth = depthMap.get(pathway.id) ?? 0;
    const nodeSize = Math.max(32, 44 - depth * 4);

    elements.push({
      data: {
        id: pathway.id,
        label: truncateLabel(pathway.name, 25),
        fullLabel: pathway.name,
        type: "pathway",
        category: pathway.category,
        source: pathway.source,
        url: pathway.url,
        depth,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        nodeSize,
      },
    });

    // Edge from gene to pathway
    elements.push({
      data: {
        id: `edge-${seedGene.id}-${pathway.id}`,
        source: seedGene.id,
        target: pathway.id,
        type: "participates_in",
      },
    });
  }

  // Add hierarchy edges (pathway to pathway) if showHierarchy is enabled
  const showHierarchy = filterState?.showHierarchy ?? true;
  if (showHierarchy) {
    const pathwayIds = new Set(filteredPathways.map((p) => p.id));
    for (const edge of hierarchyEdges) {
      if (pathwayIds.has(edge.parentId) && pathwayIds.has(edge.childId)) {
        elements.push({
          data: {
            id: `hier-${edge.childId}-${edge.parentId}`,
            source: edge.childId,
            target: edge.parentId,
            type: "part_of",
          },
        });
      }
    }
  }

  return elements;
}

/**
 * Filter pathways by category based on filter state.
 * If selectedCategories is empty, all pathways are included.
 */
export function filterPathwaysByCategory(
  pathways: PathwayNode[],
  filterState?: CategoryFilterState,
): PathwayNode[] {
  if (!filterState || filterState.selectedCategories.size === 0) {
    return pathways;
  }

  // When categories are in selectedCategories, they are filtered OUT
  return pathways.filter(
    (p) => !filterState.selectedCategories.has(p.category),
  );
}

/**
 * Find root pathways (pathways with no parent in the current set)
 */
export function findRootPathways(
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[],
): PathwayNode[] {
  const pathwayIds = new Set(pathways.map((p) => p.id));

  // Build set of pathways that have a parent within our set
  const hasParent = new Set<string>();
  for (const edge of hierarchyEdges) {
    if (pathwayIds.has(edge.parentId) && pathwayIds.has(edge.childId)) {
      hasParent.add(edge.childId);
    }
  }

  // Root pathways are those without a parent
  return pathways.filter((p) => !hasParent.has(p.id));
}

/**
 * Build hierarchy tree as adjacency map
 */
export function buildHierarchyTree(
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[],
): Map<string, string[]> {
  const pathwayIds = new Set(pathways.map((p) => p.id));
  const tree = new Map<string, string[]>();

  // Initialize all pathways with empty children arrays
  for (const pathway of pathways) {
    tree.set(pathway.id, []);
  }

  // Add children based on hierarchy edges
  for (const edge of hierarchyEdges) {
    if (pathwayIds.has(edge.parentId) && pathwayIds.has(edge.childId)) {
      const children = tree.get(edge.parentId);
      if (children) {
        children.push(edge.childId);
      }
    }
  }

  return tree;
}

/**
 * Build depth map for pathways based on hierarchy.
 * Root pathways have depth 0, children have increasing depth.
 */
function buildDepthMap(
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[],
): Map<string, number> {
  const depthMap = new Map<string, number>();
  const childToParent = new Map<string, string>();
  const pathwayIds = new Set(pathways.map((p) => p.id));

  for (const edge of hierarchyEdges) {
    if (pathwayIds.has(edge.childId) && pathwayIds.has(edge.parentId)) {
      childToParent.set(edge.childId, edge.parentId);
    }
  }

  for (const pathway of pathways) {
    let depth = 0;
    let current = pathway.id;
    let parent = childToParent.get(current);
    while (parent !== undefined) {
      depth++;
      current = parent;
      parent = childToParent.get(current);
      if (depth > 10) break; // Prevent infinite loops
    }
    depthMap.set(pathway.id, depth);
  }

  return depthMap;
}

/**
 * Truncate label for display, preserving word boundaries
 */
function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  const truncated = label.slice(0, maxLen - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) {
    return `${truncated.slice(0, lastSpace)}…`;
  }
  return `${truncated}…`;
}
