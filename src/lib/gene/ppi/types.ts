import type {
  BiogridInteraction,
  IntactInteraction,
  HuriInteraction,
} from "@/lib/gene/ppi/constants";

export interface UnifiedPPIInteraction {
  id: string;
  gene_a: string;
  gene_b: string;
  method?: string;
  degree?: string;
  confidence?: number | undefined;
  source: string;
  publication?: string | undefined;
  publication_identifiers?: string | undefined;
  interaction_type?: string;
}

export interface PPINetworkInteraction {
  gene_interactor_a: string;
  gene_interactor_b: string;
  method?: string;
  degree?: string;
  source: string;
  interaction_type?: string;
  confidence?: number;
  publication?: string;
}

export interface PPIComponentProps {
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
}

export interface PPITableProps extends PPIComponentProps {
  data: UnifiedPPIInteraction[];
}

export interface PPINetworkProps extends PPIComponentProps {
  interactions: PPINetworkInteraction[];
  sourceInfo: {
    name: string;
    description: string;
    color: string;
  };
}

export interface PPIClientProps {
  data: BiogridInteraction[] | IntactInteraction[] | HuriInteraction[];
  sourceKey: "BioGRID" | "IntAct" | "HuRI";
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: "gene";
  degree: number;
  isQueryGene: boolean;
  interactions: PPINetworkInteraction[];
  methods: string[];
  interactionTypes: string[];
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  methods: string[];
  interactionTypes: string[];
  publications: string[];
  studyCount: number;
  confidence?: number;
  type: "interaction";
  allInteractions: PPINetworkInteraction[];
}
export type VisualizationType = "network" | "chord";

export interface VisualizationRecommendation {
  type: VisualizationType;
  isRecommended: boolean;
  reason?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  degree: number;
  isQueryGene?: boolean;
  interactions?: any[];
  methods?: string[];
  interactionTypes?: string[];
  [key: string]: any;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  studyCount?: number;
  interactionType?: string;
  method?: string;
  [key: string]: any;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface ChordData {
  matrix: number[][];
  labels: string[];
  colors?: string[];
  nodeData: Record<string, NetworkNode>;
  edges?: NetworkEdge[];
}

export interface VisualizationConfig {
  type: VisualizationType;
  nodeCount: number;
  maxRecommendedNodes: number;
}

export const VISUALIZATION_CONFIG = {
  CHORD_MAX_NODES: 39,
  DEFAULT_VIEW: "network" as VisualizationType,
} as const;

export const VISUALIZATION_LABELS = {
  network: "Network View",
  chord: "Chord Diagram",
} as const;
