/**
 * cCRE types — Graph API structure
 * Sourced from /graph/cCRE/{id} endpoint
 */

/** cCRE node from the knowledge graph (33 properties) */
export interface GraphCcre {
  id: string;
  ccre_name: string;
  ccre_description: string;
  chromosome: string;
  start_position: number;
  end_position: number;
  annotation: string;
  annotation_label: string;
  biosample_count: number;
  assay_support_types: string[];
  nearest_gene_id: string;
  nearest_gene_symbol: string;
  distance_to_nearest_tss: number;
  abc_supported_gene_count: number;
  max_dnase_signal: number;
  max_atac_signal: number;
  max_h3k27ac_signal: number;
  max_h3k4me3_signal: number;
  max_ctcf_signal: number;
  conservation_score_mean: number;
  vista_enhancer_overlap: boolean;
  super_enhancer_overlap: boolean;
  loop_anchor_overlap: boolean;
  is_silencer: boolean;
  silencer_study_count: number | null;
  silencer_studies: string[] | null;
  is_dynamic_enhancer: boolean;
  dynamic_enhancer_cell_types: string[] | null;
  mpra_tested: boolean;
  mpra_experiment_count: number;
  capra_tested: boolean;
  capra_experiment_count: number;
  capra_min_padj: number | null;
}

/** Neighbor node in an edge relation */
export interface EdgeNeighbor {
  type: string;
  id: string;
  [key: string]: unknown;
}

/** Edge link with source/target and properties */
export interface EdgeLink {
  type: string;
  direction: string;
  from: { type: string; id: string };
  to: { type: string; id: string };
  props: Record<string, unknown>;
}

/** Single edge row from included relations */
export interface EdgeRow {
  neighbor: EdgeNeighbor;
  link: EdgeLink;
}

/** A group of edges of the same type */
export interface EdgeRelation {
  direction: string;
  neighbor_mode: string;
  rows: EdgeRow[];
  hasMore?: boolean;
}

/** Edge counts keyed by edge type */
export type EdgeCounts = Record<string, number>;

/** Edge relations keyed by edge type */
export type EdgeRelations = Record<string, EdgeRelation>;

/** Full response from /graph/cCRE/{id} */
export interface CcreEntityResponse {
  data: GraphCcre;
  included?: {
    counts?: EdgeCounts;
    relations?: EdgeRelations;
  };
  meta?: Record<string, unknown>;
}
