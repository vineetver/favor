// Gene data types matching the actual gene payload structure

export interface Gene {
  // Basic gene information
  id: string;
  gene_symbol: string;
  gene_id_versioned: string;
  chromosome: string;
  chrom_id: number;
  start_position: number;
  end_position: number;
  start0: number;
  end0_excl: number;
  vid_start: number;
  vid_end_excl: number;
  start_bin_1m: number;
  end_bin_1m: number;
  strand: string;
  gene_type: string;
  level: number;
  is_canonical: boolean;

  // External identifiers
  hgnc_id: string;
  entrez_id: number;
  uniprot_id: string;
  uniprot_ids_all: string[];
  omim_id: number;
  refseq_accession: string;
  xref_gene_name: string;
  locus_type: string;
  aliases: string;
  primary_source: string;
  uniprot_acc_hgnc_uniprot: string;
  uniprot_id_hgnc_uniprot: string;
  ccds_id: string;
  ucsc_id: string;
  mim_id: string;
  vega_id: string;
  cosmic: string | null;
  orphanet: number;
  agr: string;
  mirbase: number | null;
  ena: string;
  refseq_id: string;
  cd: string | null;
  gene_name: string;
  gene_old_names: string;
  gene_other_names: string | null;
  function_description: string;
  cyto_location: string;
  computed_cyto_location: string;
  protein_class?: string;
  hpa_evidence?: string;
  interactions_int_act?: string;
  interactions_bio_grid?: string;
  interactions_consensus_path_db?: string;
  
  // Additional external IDs
  ensembl_gene?: string;
  locus_group?: string;
  gene_family?: string;
  pubmed_id?: string;
  lsdb?: string;
  snornabase?: string;
  bioparadigms_slc?: string;
  pseudogene_org?: string;
  horde_id?: string;
  merops?: string;
  imgt?: string;
  iuphar?: string;
  kznf_gene_catalog?: string;
  mamit_trnadb?: string;
  lncrnadb?: string;
  enzyme_id?: string;
  intermediate_filament_db?: string;
  rna_central_ids?: string;
  lncipedia?: string;
  gtrnadb?: string;
  mgd_id?: string;
  rgd_id?: string;
  inheritance?: string;
  pheno_key?: string;
  pheno?: string;

  // Nested constraint scores structure
  constraint_scores: {
    loeuf: {
      transcript: string;
      mane_select: boolean;
      lof_hc_lc_obs: number;
      lof_hc_lc_exp: number;
      lof_hc_lc_oe: number;
      lof_hc_lc_pLI: number;
      lof_obs: number;
      lof_exp: number;
      lof_oe: number;
      lof_pLI: number;
      lof_oe_ci_lower: number;
      lof_oe_ci_upper: number;
      mis_obs: number;
      mis_exp: number;
      mis_oe: number;
      mis_z_score: number;
      syn_obs: number;
      syn_exp: number;
      syn_oe: number;
      syn_z_score: number;
      flags: string;
    };
    posterior: {
      phaplo: number;
      ptriplo: number;
    };
    shet: {
      mean_s_het: number;
      s_het_lower_95: number;
      s_het_upper_95: number;
    };
    damage: {
      gdi: number;
      gdi_phred: number;
      ghis: number;
      p_hi: string;
      p_rec: string;
      hi_pred_score: string;
      hi_pred: string;
      rvis_evs: string;
      rvis_percentile_evs: string;
      rvis_ex_ac: string;
      rvis_percentile_ex_ac: string;
      lo_f_fdr_ex_ac: string;
      ex_ac_del_score: string;
      ex_ac_dup_score: string;
      ex_ac_cnv_score: string;
    };
    gnomad: {
      gnom_ad_p_li: string;
      gnom_ad_p_rec: string;
      gnom_ad_p_null: string;
      ex_ac_p_li: string;
      ex_ac_p_rec: string;
      ex_ac_p_null: string;
      ex_ac_non_tcga_p_li: string;
      ex_ac_non_tcga_p_rec: string;
      ex_ac_non_tcga_p_null: string;
      ex_ac_nonpsych_p_li: string;
      ex_ac_nonpsych_p_rec: string;
      ex_ac_nonpsych_p_null: string;
    };
  };

  // GO terms
  go: {
    biological_process: string;
    molecular_function: string;
    cellular_component: string;
  };

  // Pathways
  pathways: {
    kegg_id: string;
    kegg_full: string;
    uniprot: string;
    biocarta_short: string;
    biocarta_full: string;
    consensus_path_db: string;
  };

  // Disease and phenotype information
  disease_phenotype: {
    disease_description: string;
    allelic_requirement: string;
    ddd_category: string;
    mim_phenotype_id: string;
    mim_disease: string;
    orphanet_disorder_id: string;
    orphanet_disorder: string;
    orphanet_association_type: string;
    hpo_id: string;
    hpo_name: string;
    trait_association_gwas: string;
  };

  // Protein information
  protein: {
    subcellular_location: string;
    subcellular_main_location: string;
    subcellular_additional_location: string;
    tissue_specificity_uniprot: string;
    secretome_location: string;
    blood_concentration_conc_blood_im_pg_l: number;
    blood_concentration_conc_blood_ms_pg_l: number;
    antibody: string;
    antibody_rrid: string;
  };

  // RNA expression
  rna_expression: {
    tissue_specificity: string;
    tissue_distribution: string;
    tissue_specificity_score: number;
    cell_line_specificity: string;
    cell_line_distribution: string;
    cell_line_specificity_score: number;
    cancer_specificity: string;
    cancer_distribution: string;
    cancer_specificity_score: number;
    brain_regional_specificity: string;
    brain_regional_distribution: string;
    brain_regional_specificity_score: number;
    blood_cell_specificity: string;
    blood_cell_distribution: string;
    blood_cell_specificity_score: number;
    expression_egenetics: string;
    expression_gnf_atlas: string;
  };

  // GTEx tissue expression data
  gtex: {
    adipose_subcutaneous: number;
    adipose_visceral_omentum: number;
    adrenal_gland: number;
    artery_aorta: number;
    artery_coronary: number;
    artery_tibial: number;
    bladder: number;
    brain_amygdala: number;
    brain_anterior_cingulate_cortex_ba24: number;
    brain_caudate_basal_ganglia: number;
    brain_cerebellar_hemisphere: number;
    brain_cerebellum: number;
    brain_cortex: number;
    brain_frontal_cortex_ba9: number;
    brain_hippocampus: number;
    brain_hypothalamus: number;
    brain_nucleus_accumbens_basal_ganglia: number;
    brain_putamen_basal_ganglia: number;
    brain_spinal_cord_cervical_c_1: number;
    brain_substantia_nigra: number;
    breast_mammary_tissue: number;
    cells_cultured_fibroblasts: number;
    cells_ebv_transformed_lymphocytes: number;
    cervix_ectocervix: number;
    cervix_endocervix: number;
    colon_sigmoid: number;
    colon_transverse: number;
    esophagus_gastroesophageal_junction: number;
    esophagus_mucosa: number;
    esophagus_muscularis: number;
    fallopian_tube: number;
    heart_atrial_appendage: number;
    heart_left_ventricle: number;
    kidney_cortex: number;
    kidney_medulla: number;
    liver: number;
    lung: number;
    minor_salivary_gland: number;
    muscle_skeletal: number;
    nerve_tibial: number;
    ovary: number;
    pancreas: number;
    pituitary: number;
    prostate: number;
    skin_not_sun_exposed_suprapubic: number;
    skin_sun_exposed_lower_leg: number;
    small_intestine_terminal_ileum: number;
    spleen: number;
    stomach: number;
    testis: number;
    thyroid: number;
    uterus: number;
    vagina: number;
    whole_blood: number;
  };

  // Model organism data
  model_organisms: {
    mouse: {
      gene: string;
      phenotype: string;
    };
    zebrafish: {
      gene: string;
      structure: string;
      phenotype_quality: string;
      phenotype_tag: string;
    };
  };

  // Essentiality data
  essentiality: {
    essential_gene: string;
    essential_gene_crispr: string;
    essential_gene_crispr2: string;
    essential_gene_gene_trap: string;
    gene_indispensability_score: string;
    gene_indispensability_pred: string;
  };

  // OpenTargets data
  opentargets: {
    approved_name: string;
    biotype: string;
    tss: number;
    transcript_ids: string[];
    canonical_transcript: {
      id: string;
      chromosome: string;
      start: number;
      end: number;
      strand: string;
    };
    canonical_exons: string[];
    alternative_genes: string[];
    synonyms: Array<{ label: string; source: string }>;
    symbol_synonyms: Array<{ label: string; source: string }>;
    name_synonyms: Array<{ label: string; source: string }>;
    obsolete_symbols: Array<{ label: string; source: string }>;
    obsolete_names: Array<{ label: string; source: string }>;
    function_descriptions: string[];
    subcellular_locations: Array<{ location: string; source: string; termSL: string; labelSL: string }>;
    protein_ids: Array<{ id: string; source: string }>;
    db_xrefs: Array<{ id: string; source: string }>;
    constraint: Array<{
      constraintType: string;
      score: number;
      exp: number;
      obs: number;
      oe: number;
      oeLower: number;
      oeUpper: number;
      upperRank: number;
      upperBin: number;
      upperBin6: number;
    }>;
    go: Array<{ id: string; source: string; evidence: string; aspect: string; geneProduct: string; ecoId: string }>;
    pathways: Array<{ pathwayId: string; pathway: string; topLevelTerm: string }>;
    homologues: Array<{
      speciesId: string;
      speciesName: string;
      homologyType: string;
      targetGeneId: string;
      isHighConfidence: string;
      targetGeneSymbol: string;
      queryPercentageIdentity: number;
      targetPercentageIdentity: number;
      priority: number;
    }>;
    tractability: Array<{ modality: string; id: string; value: boolean }>;
    target_class: Array<{ id: number; label: string; level: string }>;
    safety_liabilities: Array<{
      event: string;
      eventId: string;
      effects: Array<{ direction: string; dosing: string }>;
      biosamples: Array<{ tissueLabel: string; tissueId: string; cellLabel: string; cellFormat: string; cellId: string }>;
      datasource: string;
      literature: string;
      url: string;
      studies: Array<{ description: string; name: string; type: string }>;
    }>;
    chemical_probes: Array<{
      targetFromSourceId: string;
      id: string;
      drugId: string;
      mechanismOfAction: string[];
      origin: string[];
      control: string;
      isHighQuality: boolean;
      probesDrugsScore: number;
      probeMinerScore: number;
      scoreInCells: number;
      scoreInOrganisms: number;
      urls: Array<{ niceName: string; url: string }>;
    }>;
    hallmarks: {
      attributes: Array<{ pmid: number; description: string; attribute_name: string }>;
      cancerHallmarks: Array<{ pmid: number; description: string; impact: string; label: string }>;
    };
    tep: {
      targetFromSourceId: string;
      description: string;
      therapeuticArea: string;
      url: string;
    };
  };
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