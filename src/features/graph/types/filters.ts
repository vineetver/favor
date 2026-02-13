import type { EdgeType } from "./edge";
import { EDGE_TYPE_CONFIG } from "./edge";
import type { ExplorerSelection } from "./node";
import { DEFAULT_SELECTION } from "./node";

// =============================================================================
// Graph Filters
// =============================================================================

export interface GraphFilters {
  edgeTypes: Set<EdgeType>;
  minSources: number;
  minExperiments: number;
  maxDepth: number;
  showOrphans: boolean;
}

export const DEFAULT_FILTERS: GraphFilters = {
  edgeTypes: new Set(Object.keys(EDGE_TYPE_CONFIG) as EdgeType[]),
  minSources: 0,
  minExperiments: 0,
  maxDepth: 4,
  showOrphans: true,
};

export { DEFAULT_SELECTION };
export type { ExplorerSelection };
