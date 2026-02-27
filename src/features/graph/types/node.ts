import type { EntityType, ExplorerEntity } from "./entity";
import type { EdgeType } from "./edge";
import type { NodeKey, EdgeKey } from "./keys";

// =============================================================================
// Node & Edge Types for Cytoscape
// =============================================================================

export interface ExplorerNode {
  id: string;
  key: NodeKey;
  type: EntityType;
  label: string;
  subtitle?: string;
  entity: ExplorerEntity;
  isSeed: boolean;
  depth: number;
  degree?: number;
  hubScore?: number;
  percentile?: number;
}

export interface ExplorerEdge {
  id: string;
  key: EdgeKey;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  sourceKey: NodeKey;
  targetKey: NodeKey;
  numSources?: number;
  numExperiments?: number;
  evidence?: {
    sources?: string[];
    pubmedIds?: string[];
    detectionMethods?: string[];
  };
  fields?: Record<string, unknown>;
}

// =============================================================================
// Selection State (Discriminated Union)
// =============================================================================

export type ExplorerSelection =
  | { type: "none" }
  | { type: "node"; nodeId: string; node: ExplorerNode }
  | { type: "edge"; edgeId: string; edge: ExplorerEdge }
  | { type: "multi"; nodeIds: Set<string> };

export const DEFAULT_SELECTION: ExplorerSelection = { type: "none" };

// =============================================================================
// Inspector & Hover
// =============================================================================

export type InspectorMode = "closed" | "peek" | "pinned" | "full";

export interface HoveredEdgeInfo {
  edge: ExplorerEdge;
  sourceLabel: string;
  targetLabel: string;
  position: { x: number; y: number };
}
