import type { EdgeType } from "./edge";
import type { ExplorerEdge } from "./node";

/** A merged edge group for the drilldown UI */
export interface ConnectionsEdgeGroup {
  type: EdgeType;
  direction: "out" | "in";
  totalCount: number;
  edges: ExplorerEdge[];
  nextCursor?: string;
  pageStatus: "idle" | "loading" | "error";
  /** True if at least one edge was already in the local graph */
  hasLocalEdges: boolean;
}

export interface ConnectionsDrilldownData {
  sourceId: string;
  targetId: string;
  groups: ConnectionsEdgeGroup[];
}

export type ConnectionsStatus = "idle" | "loading" | "ready" | "error";
