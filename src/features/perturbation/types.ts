export interface CrisprRow {
  perturbation_gene: string;
  score_name: string;
  score_value: number;
  is_significant: boolean;
  significance_criteria?: string;
  dataset_id: string;
  perturbation_type?: string;
  tissue?: string;
  tissue_id?: string;
  cell_type?: string;
  cell_type_id?: string;
  cell_line?: string;
  cell_line_id?: string;
  disease?: string;
  disease_id?: string;
  study_title?: string;
  study_year?: number;
  score_interpretation?: string;
}

export interface FetchCrisprParams {
  dataset_id?: string;
  tissue?: string;
  disease?: string;
  cell_line?: string;
  perturbation_type?: string;
  score_name?: string;
  significant_only?: boolean;
  cursor?: string;
  limit?: number;
}

export interface PerturbSeqRow {
  perturbation_gene: string;
  effect_gene: string;
  log2fc: number;
  padj?: number;
  score_name: string;
  score_value: number;
  is_significant: boolean;
  dataset_id: string;
  perturbation_type?: string;
  tissue?: string;
  tissue_id?: string;
  cell_type?: string;
  cell_type_id?: string;
  cell_line?: string;
  disease?: string;
  disease_id?: string;
  study_title?: string;
  study_year?: number;
}

export interface MaveRow {
  perturbation_gene: string;
  perturbation_name: string;
  position: number;
  aa_wt?: string;
  aa_change?: string;
  score_name: string;
  score_value: number;
  dataset_id: string;
}

export interface FetchMaveParams {
  dataset_id?: string;
  score_name?: string;
  cursor?: string;
  limit?: number;
}

export interface FetchPerturbSeqParams {
  dataset_id?: string;
  tissue?: string;
  disease?: string;
  cell_line?: string;
  perturbation_type?: string;
  score_name?: string;
  significant_only?: boolean;
  effect_gene?: string;
  cell_type?: string;
  cursor?: string;
  limit?: number;
}
