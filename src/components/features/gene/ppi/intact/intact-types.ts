import type { ColumnDef } from "@tanstack/react-table";

export interface IntactProcessedInteraction {
  id: string;
  gene_a: string;
  gene_b: string;
  method: string;
  interaction_type: string;
  confidence: number;
  source: string;
  publication: string;
  publication_identifier: string;
  expansion_method: string;
  biological_role_a: string;
  biological_role_b: string;
  experimental_role_a: string;
  experimental_role_b: string;
  host_organism: string;
  negative: boolean;
  degree: string;
  gene_a_id: string;
  gene_b_id: string;
  type_interactor_a: string;
  type_interactor_b: string;
  interaction_annotation: string;
  detection_method_count: number;
}

export interface IntactCytoscapeNodeData {
  id: string;
  label: string;
  type: "gene";
  degree: number;
  isQueryGene: boolean;
  interactions: IntactProcessedInteraction[];
  methods: string[];
  interactionTypes: string[];
  expansionMethods: string[];
  biologicalRoles: string[];
  experimentalRoles: string[];
  hostOrganisms: string[];
  hasNegativeInteractions: boolean;
  interactorTypes: string[];
}

export interface IntactCytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  methods: string[];
  interactionTypes: string[];
  publications: string[];
  studyCount: number;
  confidence?: number;
  type: "interaction";
  allInteractions: IntactProcessedInteraction[];
  expansionMethods: string[];
  biologicalRoles: string[];
  experimentalRoles: string[];
  hostOrganisms: string[];
  hasNegativeInteractions: boolean;
  detectionMethodCount: number;
}

export type IntactColumnDef = ColumnDef<IntactProcessedInteraction>;
