import type { ElementDefinition } from "cytoscape";
import {
  getCategoryColor,
  type PathwayHierarchyEdge,
  type PathwayNode,
} from "../components/pathway-map/types";

/**
 * Transform pathway data to Cytoscape elements.
 * Gene node in center, pathway nodes around it with edges.
 */
export function buildCytoscapeElements(
  seedGene: { id: string; symbol: string },
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[] = [],
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];

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
  const depthMap = buildDepthMap(pathways, hierarchyEdges);

  // Add pathway nodes
  for (const pathway of pathways) {
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

  // Add hierarchy edges (pathway to pathway)
  const pathwayIds = new Set(pathways.map((p) => p.id));
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

  return elements;
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
