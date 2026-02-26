import type { EntityType } from "./entity";
import type { EdgeType } from "./edge";

// =============================================================================
// Fetch State (Generic Discriminated Union)
// =============================================================================

export type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "error"; error: string };

export function idleState<T>(): FetchState<T> {
  return { status: "idle" };
}

export function loadingState<T>(): FetchState<T> {
  return { status: "loading" };
}

export function loadedState<T>(data: T): FetchState<T> {
  return { status: "loaded", data };
}

export function errorState<T>(error: string): FetchState<T> {
  return { status: "error", error };
}

// =============================================================================
// Graph Schema & Stats
// =============================================================================

export interface EdgeTypeStats {
  edgeType: EdgeType;
  count: number;
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
  label?: string;
  defaultScoreField?: string;
  scoreFields?: string[];
  filterFields?: string[];
}

export interface GraphSchema {
  nodeTypes: EntityType[];
  edgeTypes: EdgeTypeStats[];
  lastUpdated?: string;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeCounts: Record<EntityType, number>;
  edgeCounts: Record<EdgeType, number>;
}
