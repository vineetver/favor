import type { ElementDefinition } from "cytoscape";
import type { EdgeType } from "../types/edge";
import type { EntityType } from "../types/entity";
import type { GraphFilters } from "../types/filters";
import type { ExplorerSelection } from "../types/node";
import type { AsyncOperation, ExplorerState, GraphData } from "../types/state";
import { getGraphSummary, transformToElements } from "../utils/elements";

/**
 * Derive Cytoscape elements from graph data + filters
 */
export function selectElements(
  graph: GraphData,
  filters: GraphFilters,
): ElementDefinition[] {
  return transformToElements(graph.nodes, graph.edges, filters);
}

/**
 * Derive node/edge type counts from graph data
 */
export function selectGraphSummary(graph: GraphData): {
  nodeTypeCounts: Record<EntityType, number>;
  edgeTypeCounts: Record<EdgeType, number>;
} {
  return getGraphSummary(graph.nodes, graph.edges);
}

/**
 * Derive highlighted node IDs from selection
 */
export function selectHighlightedNodeIds(
  selection: ExplorerSelection,
): Set<string> | undefined {
  if (selection.type === "multi") return selection.nodeIds;
  if (selection.type === "node") return new Set([selection.nodeId]);
  return undefined;
}

/**
 * Derive highlighted edge ID from selection
 */
export function selectHighlightedEdgeId(
  selection: ExplorerSelection,
): string | undefined {
  if (selection.type === "edge") return selection.edgeId;
  return undefined;
}

/**
 * Check if any async operation is in progress (template switching, expanding, variant trail).
 * Replaces the old `selectIsExpanding`.
 */
export function selectIsLoading(state: ExplorerState): boolean {
  if (state.status !== "ready") return false;
  return state.async.type !== "idle" && state.async.type !== "error";
}

/**
 * Get the current async operation for components needing specific loading context.
 */
export function selectAsyncOperation(state: ExplorerState): AsyncOperation {
  if (state.status !== "ready") return { type: "idle" };
  return state.async;
}

/** @deprecated Use selectIsLoading instead */
export function selectIsExpanding(state: ExplorerState): boolean {
  return selectIsLoading(state);
}
