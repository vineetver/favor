import type { ChordData, NetworkNode } from "../../shared/types";

export interface ChordDiagramProps {
  data: ChordData;
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
  queryGene?: string;
  width?: number;
  height?: number;
}

export interface ChordGroup {
  index: number;
  startAngle: number;
  endAngle: number;
  value: number;
}

export interface ChordRibbon {
  source: ChordGroup;
  target: ChordGroup;
}

export interface ChordArc {
  index: number;
  startAngle: number;
  endAngle: number;
  value: number;
  label: string;
  nodeData: NetworkNode;
}

export interface ChordConfig {
  innerRadius: number;
  outerRadius: number;
  padAngle: number;
  colors: string[];
}
