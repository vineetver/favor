// =============================================================================
// GWAS Catalog Types for Table Display
// =============================================================================

/**
 * GWAS association row from the internal GWAS Catalog API.
 * Maps to the /api/v1/gwas/{reference} endpoint response.
 */
export interface GwasAssociationRow {
  /** 64-bit VariantKey ID */
  vid: string;
  /** dbSNP rsID */
  rsid: string | null;
  /** VCF format: chr-pos-ref-alt */
  variantVcf: string;
  /** Chromosome */
  chromosome: string;
  /** Genomic position */
  position: number;
  /** Mapped gene symbol */
  mappedGene: string | null;
  /** Reported genes from study */
  reportedGenes: string | null;
  /** Ensembl gene IDs */
  snpGeneIds: string | null;
  /** Trait name */
  trait: string | null;
  /** Disease/trait from study */
  diseaseTrait: string | null;
  /** P-value */
  pvalue: number | null;
  /** -log10(p-value) */
  pvalueMlog: number | null;
  /** Effect size (OR or beta) */
  effectSize: string | null;
  /** 95% confidence interval */
  confidenceInterval: string | null;
  /** Risk allele frequency */
  riskAlleleFrequency: string | null;
  /** Risk allele */
  riskAllele: string | null;
  /** PubMed ID */
  pubmedId: string | null;
  /** First author */
  firstAuthor: string | null;
  /** Publication date */
  publicationDate: string | null;
  /** Journal name */
  journal: string | null;
  /** Study title */
  studyTitle: string | null;
  /** GWAS Catalog study accession */
  studyAccession: string | null;
  /** Variant context (e.g., missense_variant) */
  variantContext: string | null;
  /** Whether variant is intergenic */
  intergenic: boolean | null;
  /** Cytogenetic region */
  region: string | null;
}

/**
 * Raw API response from /api/v1/gwas/{reference}
 */
export interface GwasApiResponse {
  data: GwasApiRow[];
  page_info: {
    next_cursor: string | null;
    count: number;
    has_more: boolean;
    /** Only on first page */
    total_count?: number;
  };
  /** Only on first page */
  meta?: {
    unique_traits: number;
    unique_studies: number;
  };
}

/**
 * Metadata from first page response for UI display
 */
export interface GwasMeta {
  totalCount: number;
  uniqueTraits: number;
  uniqueStudies: number;
}

/**
 * Raw API row format (snake_case from API)
 */
export interface GwasApiRow {
  vid: string;
  rsid: string | null;
  variant_vcf: string;
  chromosome: string;
  position: number;
  mapped_gene: string | null;
  reported_genes: string | null;
  snp_gene_ids: string | null;
  trait: string | null;
  disease_trait: string | null;
  pvalue: number | null;
  pvalue_mlog: number | null;
  effect_size: string | null;
  confidence_interval: string | null;
  risk_allele_frequency: string | null;
  risk_allele: string | null;
  pubmedid: string | null;
  first_author: string | null;
  publication_date: string | null;
  journal: string | null;
  study_title: string | null;
  study_accession: string | null;
  variant_context: string | null;
  intergenic: boolean | null;
  region: string | null;
}
