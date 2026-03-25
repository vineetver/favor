/**
 * Disease types — Graph API structure
 * Sourced from /graph/Disease/{id} endpoint
 */

/** Disease node from the knowledge graph */
export interface GraphDisease {
  id: string;
  disease_name: string;
  description?: string;

  // Classification
  disorder_type?: string;
  is_cancer?: boolean;
  is_rare_disease?: boolean;
  is_obsolete?: boolean;
  primary_anatomical_systems?: string[];
  majority_inheritance_mode?: string;
  age_of_onset_hpo_term?: string;
  sex_bias?: string;

  // Gene counts
  associated_gene_count?: number;
  causal_gene_count?: number;
  clinical_gene_count?: number;
  clingen_gene_count?: number;
  clingen_max_classification?: string;
  gencc_gene_count?: number;
  gencc_max_classification?: string;
  gencc_submitter_count?: number;
  omim_gene_count?: number;
  omim_gene_symbols?: string[];
  omim_mapping_status?: string;

  // Drug data
  drug_count?: number;
  max_trial_phase?: number;

  // Heritability
  heritability_h2?: number;
  heritability_se?: number;
  heritability_confidence?: string;

  // PRS
  prs_count?: number;
  prs_best_auroc?: number;
  prs_max_variants?: number;

  // Epidemiology
  point_prevalence_class?: string;
  point_prevalence_value?: number;
  annual_incidence_class?: string;
  annual_incidence_value?: number;
  birth_prevalence_class?: string;
  birth_prevalence_value?: number;
  worldwide_cases?: number;
  prevalence_region_count?: number;
  prevalence_regions?: string[];
  has_geographic_variation?: boolean;

  // Phenotypes
  key_phenotypes?: string[];

  // External identifiers
  mondo_id?: string;
  efo_id?: string;
  omim_id?: string;
  doid?: string;
  mesh_id?: string;
  medgen_cui?: string;
  umls_cui?: string;
  orphanet_id?: string;
  icd10_codes?: string[];
  icd11_codes?: string[];
  xref_ids?: string[];

  // Other
  synonyms?: string[];
  replaced_by?: string;
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

/** Full response from /graph/Disease/{id} */
export interface DiseaseEntityResponse {
  data: GraphDisease;
  included?: {
    counts?: EdgeCounts;
    relations?: EdgeRelations;
  };
  meta?: Record<string, unknown>;
}
