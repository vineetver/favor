import type { ElementDefinition } from "cytoscape";
import type { EntityType } from "./entity";
import type { EdgeType } from "./edge";
import type { ExplorerNode, ExplorerEdge, ExplorerSelection } from "./node";
import type { ProvenanceEvent } from "./provenance";
import type { GraphFilters } from "./filters";
import type { GraphSchema, GraphStats } from "./schema";
import type { ExplorerLayoutType, TemplateId } from "./state";
import type { ConnectionsDrilldownData, ConnectionsStatus } from "./connections";
import type { SeedEntity, ExplorerConfig, ExplorerTemplate, EdgeTypeGroup, ExternalLinkConfig } from "../config/explorer-config";
import type { TemplateResultData } from "./template-results";

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
    fields?: Record<string, unknown>;
  }>;
}

// =============================================================================
// Variant Trail Result Data
// =============================================================================

export interface VariantTrailResultData {
  seedNodeId: string;
  seedNodeType: EntityType;
  seedNodeLabel: string;
  variants: Array<{
    node: ExplorerNode;
    connectingEdge: ExplorerEdge;
    routeBadge: string;
  }>;
  totalFound: number;
  timestamp: number;
}

// =============================================================================
// Component Props
// =============================================================================

export interface GraphExplorerProps {
  seed: SeedEntity;
  config: ExplorerConfig;
  schema?: GraphSchema | null;
  stats?: GraphStats | null;
  initialSubgraph?: InitialSubgraphData | null;
  className?: string;
}

export interface GraphExplorerViewProps {
  seed: SeedEntity;
  config: ExplorerConfig;
  schema?: GraphSchema | null;
  stats?: GraphStats | null;
  initialSubgraph?: InitialSubgraphData | null;
  initialTemplateId?: TemplateId;
  className?: string;
}

export interface ExplorerCytoscapeProps {
  elements: ElementDefinition[];
  layout: ExplorerLayoutType;
  onNodeClick?: (node: ExplorerNode, event?: MouseEvent) => void;
  onNodeHover?: (node: ExplorerNode | null, position: { x: number; y: number } | null) => void;
  onEdgeClick?: (edge: ExplorerEdge, position: { x: number; y: number }) => void;
  onEdgeHover?: (edge: ExplorerEdge | null, position: { x: number; y: number } | null) => void;
  onNodeDoubleClick?: (node: ExplorerNode) => void;
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
  templates: ExplorerTemplate[];
  activeTemplate: TemplateId;
  onTemplateChange: (templateId: TemplateId) => void;
  edgeTypeGroups: EdgeTypeGroup[];
  onReset: () => void;
  edgeTypeCounts?: Record<EdgeType, number>;
  nodeTypeCounts?: Record<EntityType, number>;
  isExpanding: boolean;
}

export interface InspectorPanelProps {
  selection: ExplorerSelection;
  getNode: (id: string) => ExplorerNode | undefined;
  getEdge: (id: string) => ExplorerEdge | undefined;
  getProvenance: (id: string) => ProvenanceEvent[];
  getEdgesBetween: (sourceId: string, targetId: string) => ExplorerEdge[];
  onExpandNode: (nodeId: string, expansion?: ExpansionConfig) => void;
  onRemoveNode: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
  externalLinks: Partial<Record<EntityType, ExternalLinkConfig[]>>;
  enableVariantTrail: boolean;
  onRunVariantTrail?: (nodeId: string) => void;
  activeTrailResult?: VariantTrailResultData | null;
  onClearTrailResult?: () => void;
  onSelectTrailVariant?: (node: ExplorerNode) => void;
  connectionsData?: ConnectionsDrilldownData | null;
  connectionsStatus?: ConnectionsStatus;
  connectionsError?: string | null;
  onLoadMoreEdges?: (edgeType: EdgeType) => void;
  onRetryConnections?: () => void;
}

// Re-export ExpansionConfig for convenience (defined in config/expansion)
import type { ExpansionConfig } from "../config/expansion";
export type { ExpansionConfig };
