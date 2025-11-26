export interface Crispr {
  variant_vcf: string;
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
