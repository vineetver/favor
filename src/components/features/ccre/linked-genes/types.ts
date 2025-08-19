export interface Crispr {
  accession: string;
  ensemble_id: string;
  gene_name: string;
  gene_type: string;
  grna_id: string;
  assay_type: string;
  experiment_id: string;
  biosample: string;
  effect_size: string;
  p_value: number;
}

export interface Chiapet {
  accession: string;
  ensemble_id: string;
  gene_name: string;
  gene_type: string;
  assay_type: string;
  experiment_id: string;
  biosample: string;
  score: string;
  p_value: string;
}

export interface Eqtl {
  accession: string;
  ensemble_id: string;
  gene_name: string;
  gene_type: string;
  variant_vcf: string;
  source: string;
  tissue: string;
  slope: number;
  p_value: number;
}

export const CRISPR_URL = "https://api.genohub.org/v1/genes/links/crispr";
export const CHIA_PET_URL = "https://api.genohub.org/v1/genes/links/chiapet";
export const EQTL_URL = "https://api.genohub.org/v1/genes/links/eqtl";
