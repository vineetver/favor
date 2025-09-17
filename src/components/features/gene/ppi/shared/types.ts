// Shared PPI types
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  method?: string;
  interactionType?: string;
  studyCount?: number;
  weight?: number;
  data?: Record<string, any>;
}

export interface NetworkNode {
  id: string;
  label: string;
  degree: number;
  isQueryGene?: boolean;
  interactions?: any[];
  methods?: string[];
  interactionTypes?: string[];
  data?: Record<string, any>;
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
