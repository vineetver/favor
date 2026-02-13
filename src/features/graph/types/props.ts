import type { ElementDefinition } from "cytoscape";
import type { EntityType } from "./entity";
import type { EdgeType } from "./edge";
import type { ExplorerNode, ExplorerEdge, ExplorerSelection } from "./node";
import type { GraphFilters } from "./filters";
import type { GraphSchema, GraphStats } from "./schema";
import type { ExplorerLayoutType, LensId } from "./state";

// =============================================================================
// Serialized Data (JSON-safe, for server → client)
// =============================================================================

export interface InitialSubgraphData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    subtitle?: string;
  }>;
  edges: Array<{
    type: string;
    fromId: string;
    toId: string;
    numSources?: number;
    numExperiments?: number;
  }>;
}

// =============================================================================
// Component Props
// =============================================================================

export interface GraphExplorerViewProps {
  seedGeneId: string;
  seedGeneSymbol: string;
  schema?: GraphSchema | null;
  stats?: GraphStats | null;
  initialSubgraph?: InitialSubgraphData | null;
  initialLensId?: LensId;
  className?: string;
}

export interface ExplorerCytoscapeProps {
  elements: ElementDefinition[];
  layout: ExplorerLayoutType;
  onNodeClick?: (node: ExplorerNode, event?: MouseEvent) => void;
  onNodeHover?: (node: ExplorerNode | null, position: { x: number; y: number } | null) => void;
  onEdgeClick?: (edge: ExplorerEdge, position: { x: number; y: number }) => void;
  onBackgroundClick?: () => void;
  selectedNodeIds?: Set<string>;
  selectedEdgeId?: string | null;
  pathHighlight?: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
  className?: string;
}

export interface ControlsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  layout: ExplorerLayoutType;
  onLayoutChange: (layout: ExplorerLayoutType) => void;
  activeLens: LensId;
  onLensChange: (lensId: LensId) => void;
  onReset: () => void;
  edgeTypeCounts?: Record<EdgeType, number>;
  nodeTypeCounts?: Record<EntityType, number>;
  isExpanding: boolean;
}

export interface InspectorPanelProps {
  selection: ExplorerSelection;
  getNode: (id: string) => ExplorerNode | undefined;
  getEdge: (id: string) => ExplorerEdge | undefined;
  onExpandNode: (nodeId: string, expansion?: ExpansionConfig) => void;
  onRemoveNode: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
}

// Re-export ExpansionConfig for convenience (defined in config/expansion)
import type { ExpansionConfig } from "../config/expansion";
export type { ExpansionConfig };
