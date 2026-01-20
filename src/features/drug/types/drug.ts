/**
 * Drug types - FAVOR API structure
 */

export interface Drug {
  source?: string;
  chembl_id: string;
  canonical_smiles?: string | null;
  inchi_key?: string | null;
  drug_type?: string | null;
  has_black_box_warning?: boolean;
  name: string;
  year_first_approved?: number | null;
  max_clinical_trial_phase?: number | null;
  parent_id?: string | null;
  is_withdrawn?: boolean;
  is_approved?: boolean;
  trade_names?: string[];
  synonyms?: string[];
  cross_references?: CrossReference[];
  linked_diseases?: LinkedEntity;
  linked_targets?: LinkedEntity;
  description?: string | null;
  child_chembl_ids?: string[];
}

export interface CrossReference {
  source?: string;
  ids?: string[];
}

export interface LinkedEntity {
  rows?: string[];
  count?: number;
}

export interface DrugError {
  error: string;
  drug_id: string;
}

export type DrugResponse = Drug | DrugError;
