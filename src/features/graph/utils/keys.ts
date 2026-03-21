import type { EdgeType } from "../types/edge";

/**
 * Create a unique edge ID from source and target (legacy format for Cytoscape)
 */
export function createEdgeId(type: EdgeType, sourceId: string, targetId: string): string {
  return `${type}-${sourceId}-${targetId}`;
}

