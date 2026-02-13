import type { EdgeType } from "../types/edge";

/**
 * Create a unique edge ID from source and target (legacy format for Cytoscape)
 */
export function createEdgeId(type: EdgeType, sourceId: string, targetId: string): string {
  return `${type}-${sourceId}-${targetId}`;
}

/**
 * Parse edge ID back to components (legacy format)
 */
export function parseEdgeId(edgeId: string): { type: EdgeType; sourceId: string; targetId: string } | null {
  const parts = edgeId.split("-");
  if (parts.length < 3) return null;
  const type = parts[0] as EdgeType;
  const rest = parts.slice(1).join("-");
  const lastDash = rest.lastIndexOf("-");
  if (lastDash === -1) return null;
  return {
    type,
    sourceId: rest.substring(0, lastDash),
    targetId: rest.substring(lastDash + 1),
  };
}
