/**
 * Drug types — Graph API structure
 * Sourced from /graph/Drug/{id} endpoint
 */

/** Drug node from the knowledge graph */
export interface GraphDrug {
  id: string;
  drug_name: string;
  drug_type?: string;
  description?: string;
  known_as?: string[];
  canonical_smiles?: string;
  inchi_key?: string;
  molecular_formula?: string;
  molecular_weight?: number;
  atc_codes?: string[];
  atc_names?: string[];
  pharmacologic_classes?: string[];
  mechanisms_of_action?: string[];
  action_types?: string[];
  clinical_status?: string;
  is_approved?: boolean;
  max_clinical_phase?: number;
  year_first_approval?: number;
  approval_agencies?: string[];
  has_orphan_designation?: boolean | null;
  has_been_withdrawn?: boolean;
  withdrawal_reasons?: string | null;
  withdrawal_year?: number | null;
  black_box_warning?: boolean;
  boxed_warning_text?: string | null;
  half_life?: number | null;
  bioavailability?: number | null;
  protein_binding_pct?: number | null;
  routes_of_administration?: string[];
  is_prodrug?: boolean;
  natural_product?: boolean;
  drugbank_id?: string | null;
  pubchem_cid?: number | null;
  cas_number?: string | null;
  num_targets?: number;
  num_indications?: number;
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

/** Full response from /graph/Drug/{id} */
export interface DrugEntityResponse {
  data: GraphDrug;
  included?: {
    counts?: EdgeCounts;
    relations?: EdgeRelations;
  };
  meta?: Record<string, unknown>;
}
