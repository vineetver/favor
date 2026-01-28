// Gene data types for the gene feature

export interface Gene {
  ensembl_gene: string;
  chr: string;
  genomic_position_start?: number;
  genomic_position_end?: number;
  gene_description: string;
  gene_synonym: string;
  uniprot_acc_hgnc_uniprot: string;
  uniprot_id_hgnc_uniprot: string;
  ccds_id_x: string;
  refseq_id: string;
  ucsc_id_x: string;
  omim_id_x: string;
  cyto_location: string;
  hgnc_id_x: string;
  locus_group: string;
  locus_type: string;
  gene_family: string;
  entrez_id?: number;
  vega_id: string;
  ena: string;
  pubmed_id: string;
  lsdb: string;
  cosmic: string;
  snornabase: string;
  bioparadigms_slc: string;
  pseudogene_org: string;
  horde_id: string;
  merops: string;
  imgt: string;
  iuphar: string;
  kznf_gene_catalog?: number;
  mamit_trnadb: string;
  cd: string;
  lncrnadb: string;
  enzyme_id: string;
  intermediate_filament_db: string;
  rna_central_ids: string;
  lncipedia: string;
  gtrnadb: string;
  symbol: string;
  function_description: string;
  pathway_uniprot: string;
  pathway_bio_carta_full: string;
  pathway_kegg_id: string;
  pathway_kegg_full: string;
  pathway_consensus_path_db: string;
  protein_class: string;
  hpa_evidence: string;
  subcellular_location: string;
  secretome_location: string;
  mim_disease: string;
  inheritance: string;
  pheno_key: string;
  pheno: string;
  orphanet_disorder: string;
  mgi_mouse_gene: string;
  mgd_id: string;
  mgi_mouse_phenotype: string;
  rgd_id: string;
  zfin_zebrafish_gene: string;
  zfin_zebrafish_structure: string;
  zfin_zebrafish_phenotype_quality: string;
  zfin_zebrafish_phenotype_tag: string;
  
  // Expression data - tissue-specific
  adipose_subcutaneous?: number;
  adipose_visceral_omentum?: number;
  adrenal_gland?: number;
  artery_aorta?: number;
  artery_coronary?: number;
  artery_tibial?: number;
  bladder?: number;
  brain_amygdala?: number;
  brain_anterior_cingulate_cortex_ba24?: number;
  brain_caudate_basal_ganglia?: number;
  brain_cerebellar_hemisphere?: number;
  brain_cerebellum?: number;
  brain_cortex?: number;
  brain_frontal_cortex_ba9?: number;
  brain_hippocampus?: number;
  brain_hypothalamus?: number;
  brain_nucleus_accumbens_basal_ganglia?: number;
  brain_putamen_basal_ganglia?: number;
  brain_spinal_cord_cervical_c_1?: number;
  brain_substantia_nigra?: number;
  breast_mammary_tissue?: number;
  cells_cultured_fibroblasts?: number;
  cells_ebv_transformed_lymphocytes?: number;
  cervix_ectocervix?: number;
  cervix_endocervix?: number;
  colon_sigmoid?: number;
  colon_transverse?: number;
  esophagus_gastroesophageal_junction?: number;
  esophagus_mucosa?: number;
  esophagus_muscularis?: number;
  fallopian_tube?: number;
  heart_atrial_appendage?: number;
  heart_left_ventricle?: number;
  kidney_cortex?: number;
  lung?: number;
  minor_salivary_gland?: number;
  muscle_skeletal?: number;
  nerve_tibial?: number;
  ovary?: number;
  pancreas?: number;
  pituitary?: number;
  prostate?: number;
  skin_not_sun_exposed_suprapubic?: number;
  skin_sun_exposed_lower_leg?: number;
  small_intestine_terminal_ileum?: number;
  spleen?: number;
  stomach?: number;
  testis?: number;
  thyroid?: number;
  uterus?: number;
  vagina?: number;
  whole_blood?: number;

  // Protein-protein interactions
  interactions_int_act: string;
  interactions_bio_grid: string;
  interactions_consensus_path_db: string;

  // Constraints and Haploinsufficiency
  p_hi?: number;
  hi_pred_score?: number;
  hi_pred: string;
  rvis_evs?: number;
  rvis_percentile_evs?: number;
  rvis_ex_ac?: number;
  rvis_percentile_ex_ac?: number;
  lo_ftool_score?: number;
  lo_f_fdr_ex_ac?: number;
  gnom_ad_p_li?: number;
  gnom_ad_p_rec?: number;
  gnom_ad_p_null?: number;
  ghis?: number;
  p_rec?: number;
  gdi?: number;
  gdi_phred?: number;
  s_het?: number;
  phaplo?: number;
  ptriplo?: number;
}

export interface GeneColumn {
  key: number;
  header: string;
  accessor: string;
  tooltip: string;
  Cell?: (value: any) => React.JSX.Element | undefined;
}

export interface GeneColumnGroup {
  name: string;
  slug: string;
  items: GeneColumn[];
}

// Re-export commonly used React type
export type { ReactNode } from 'react';