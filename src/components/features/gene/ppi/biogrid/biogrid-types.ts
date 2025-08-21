import type { ColumnDef } from "@tanstack/react-table";

export interface BiogridProcessedInteraction {
  id: string;
  gene_a: string;
  gene_b: string;
  method: string;
  degree: string;
  confidence: number;
  source: string;
  publication: string;
  publication_identifiers: string;
  interaction_type: string;
}

export interface BiogridCytoscapeNodeData {
  id: string;
  label: string;
  type: "gene";
  degree: number;
  isQueryGene: boolean;
  interactions: BiogridProcessedInteraction[];
  methods: string[];
  interactionTypes: string[];
}

export interface BiogridCytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  methods: string[];
  interactionTypes: string[];
  publications: string[];
  studyCount: number;
  confidence?: number;
  type: "interaction";
  allInteractions: BiogridProcessedInteraction[];
}

export type BiogridColumnDef = ColumnDef<BiogridProcessedInteraction>;
