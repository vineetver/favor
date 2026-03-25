/**
 * Phenotype types — Graph API structure
 * Sourced from /graph/Phenotype/{id} endpoint
 */

/** Phenotype node from the knowledge graph */
export interface GraphPhenotype {
  id: string;
  phenotype_name: string;
  phenotype_definition?: string;
  synonyms?: string[];
  ontology_source: string;
  upheno_equivalent?: string | null;
  disease_count: number;
  gene_count: number;
  gwas_variant_count: number;
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
}

/** Edge counts keyed by edge type */
export type EdgeCounts = Record<string, number>;

/** Edge relations keyed by edge type */
export type EdgeRelations = Record<string, EdgeRelation>;

/** Full response from /graph/Phenotype/{id} */
export interface PhenotypeEntityResponse {
  data: GraphPhenotype;
  included?: {
    counts?: EdgeCounts;
    relations?: EdgeRelations;
  };
  meta?: Record<string, unknown>;
}
