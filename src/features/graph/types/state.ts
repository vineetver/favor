import type { ExplorerNode, ExplorerEdge, ExplorerSelection } from "./node";
import type { GraphFilters } from "./filters";
import type { NodeKey } from "./keys";
import type { ExplorerLayoutType } from "../config/layout";
import type { LensId } from "../config/lenses";

// =============================================================================
// View & Panel State
// =============================================================================

export type ViewMode = "graph" | "list" | "split";

export type ActivePanel =
  | "none"
  | "inspector"
  | "pathFinder"
  | "intersection"
  | "settings";

// =============================================================================
// Graph Data (sub-object for merge operations)
// =============================================================================

export interface GraphData {
  nodes: Map<string, ExplorerNode>;
  edges: Map<string, ExplorerEdge>;
  seeds: Set<string>;
}

// =============================================================================
// Expansion State
// =============================================================================

export type ExpansionStatus =
  | { status: "idle" }
  | { status: "loading" };

// =============================================================================
// Explorer State (Discriminated Union)
// =============================================================================

export type ExplorerState =
  | { status: "idle" }
  | {
      status: "ready";
      graph: GraphData;
      selection: ExplorerSelection;
      filters: GraphFilters;
      layout: ExplorerLayoutType;
      viewMode: ViewMode;
      activeLens: LensId;
      leftDrawerOpen: boolean;
      rightPanelOpen: boolean;
      expansion: ExpansionStatus;
    };

// Re-export for convenience (canonical definitions in config/)
export type { ExplorerLayoutType } from "../config/layout";
export type { LensId } from "../config/lenses";

// =============================================================================
// Panel State
// =============================================================================

export interface PanelState {
  leftDrawerOpen: boolean;
  rightPanelOpen: boolean;
}
