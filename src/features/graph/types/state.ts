import type { ExplorerNode, ExplorerEdge, ExplorerSelection, InspectorMode } from "./node";
import type { GraphFilters } from "./filters";
import type { NodeKey } from "./keys";
import type { ProvenanceEvent } from "./provenance";
import type { ExplorerLayoutType } from "../config/layout";
import type { TemplateId } from "../config/explorer-config";
import type { TemplateResultData } from "./template-results";

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
  /** Provenance events keyed by node or edge ID. Append-only. */
  provenance: Map<string, ProvenanceEvent[]>;
}

// =============================================================================
// Async Operation (replaces ExpansionStatus)
// =============================================================================

export type AsyncOperation =
  | { type: "idle" }
  | { type: "switching_template"; targetTemplateId: TemplateId }
  | { type: "expanding"; nodeId: string; label: string }
  | { type: "running_variant_trail"; nodeId: string }
  | { type: "error"; operation: string; message: string };


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
      activeTemplate: TemplateId;
      templateResults: TemplateResultData | null;
      leftDrawerOpen: boolean;
      inspectorMode: InspectorMode;
      async: AsyncOperation;
    };

// Re-export for convenience (canonical definitions in config/)
export type { ExplorerLayoutType } from "../config/layout";
export type { TemplateId } from "../config/explorer-config";
