/**
 * Type surface for the MaveDB API. The branded discriminators below are the
 * only place raw API strings get widened into a typed domain — everything
 * downstream consumes the narrow union types.
 */

export type LabelClass = "LOF" | "GoF" | "Functional" | "Intermediate";

export type Classification = "abnormal" | "normal";

export type EvidenceStrength =
  | "SUPPORTING"
  | "MODERATE"
  | "MODERATE_PLUS"
  | "STRONG";

export type EvidenceCriterion = "PS3" | "BS3";

// ─── Page info ─────────────────────────────────────────────────────────────

export interface PageInfo {
  next_cursor?: string | null;
  count?: number;
  has_more: boolean;
  total_count?: number | null;
}

export interface Page<T> {
  data: T[];
  page_info: PageInfo;
}

// ─── Discovery ─────────────────────────────────────────────────────────────

export interface ScoresetSummary {
  urn: string;
  title: string;
  short_description: string | null;
  published_date: string | null;
  license_short_name: string | null;
  has_variants: boolean;
  num_variants: number;
  calibration_titles: string[];
}

export interface FetchScoresetsParams {
  gene?: string;
  q?: string;
  has_data?: boolean;
  has_calibration?: boolean;
  cursor?: string;
  limit?: number;
}

// ─── Detail ────────────────────────────────────────────────────────────────

export interface ScoresetCore {
  urn: string;
  experiment_urn: string;
  experiment_set_urn: string;
  title: string;
  short_description: string | null;
  abstract_text: string | null;
  method_text: string | null;
  license_short_name: string | null;
  num_variants: number;
  has_variants: boolean;
  creation_date: string | null;
  modification_date: string | null;
  published_date: string | null;
  superseded_by: string | null;
  supersedes: string | null;
}

export interface TargetGene {
  scoreset_urn: string;
  target_gene_name: string;
  category: string | null;
  uniprot: string | null;
  sequence_type: string | null;
  sequence_len: number | null;
  organism_taxonomy_id: number | null;
  organism_name: string | null;
}

export interface AssayFact {
  scoreset_urn: string;
  fact_key: string;
  fact_label: string;
  description: string | null;
}

export interface Calibration {
  scoreset_urn: string;
  calibration_title: string;
  calibration_idx: number;
  is_primary: boolean;
  research_use_only: boolean;
  baseline_score: number | null;
  baseline_score_description: string | null;
  display_label: string;
  label_class: LabelClass | null;
  classification: Classification | null;
  range_low: number | null;
  range_high: number | null;
  inclusive_lower: number | boolean | null;
  inclusive_upper: number | boolean | null;
  evidence_criterion: EvidenceCriterion | null;
  evidence_strength: EvidenceStrength | null;
  oddspath_ratio: number | null;
  variant_count: number;
}

export interface ScoresetDetail {
  scoreset: ScoresetCore;
  target_genes: TargetGene[];
  assay_facts: AssayFact[];
  calibrations_by_title: Record<string, Calibration[]>;
}

// ─── Variants table ────────────────────────────────────────────────────────

/**
 * Variants table row. Tagged on `coords` because some scoresets are scored
 * per-genomic-allele (SGE-style) and others per-amino-acid (heatmap-style)
 * — the row identity differs in kind, not just in which fields are filled.
 */
export type MavedbVariant = GenomicVariant | ProteinVariant;

export interface GenomicVariant {
  coords: "genomic";
  mavedb_id: string;
  variant_vcf: string;
  chrom_id: number;
  position: number;
  ref_allele: string;
  alt_allele: string;
  vid: number | null;
  hgvs_pro: string | null;
  hgvs_pro_accession: string | null;
  hgvs_g: string | null;
  hgvs_nt: string | null;
  score: number | null;
}

export interface ProteinVariant {
  coords: "protein";
  mavedb_id: string;
  target_accession: string;
  target_accession_versioned: string;
  /** Global aa position (e.g. 1577). Local hgvs_pro may use a different offset. */
  aa_pos: number;
  /** One-letter wild-type aa. */
  aa_ref: string;
  /** One-letter alternate aa; "*" for stop. */
  aa_alt: string;
  /** Source CSV's protein change text — what users recognize ("p.Ser1Ter"). */
  hgvs_pro: string | null;
  score: number | null;
  aa_pos_region?: AaPosRegion;
}

export interface FetchVariantsParams {
  q?: string;
  score_min?: number;
  score_max?: number;
  cursor?: string;
  limit?: number;
}

// ─── Distribution ──────────────────────────────────────────────────────────

export interface HistogramBin {
  lo: number;
  hi: number;
  count: number;
}

export interface DistributionPayload {
  bins: HistogramBin[];
  total: number;
  calibration_title: string | null;
  calibration_bands: Calibration[];
}

export type DistributionView = "overall" | "clinical";

export interface FetchDistributionParams {
  calibration_title?: string;
  view?: DistributionView;
  bins?: number;
}

// ─── Variant gateway ───────────────────────────────────────────────────────

/**
 * One row of the per-variant gateway response. Each scoreset × calibration
 * × band-hit produces one of these.
 */
export interface VariantBand {
  variant_vcf: string;
  scoreset_urn: string;
  scoreset_title: string;
  published_date: string | null;
  calibration_title: string;
  score: number;
  display_label: string;
  label_class: LabelClass | null;
  evidence_criterion: EvidenceCriterion | null;
  evidence_strength: EvidenceStrength | null;
  oddspath_ratio: number | null;
}

/**
 * Genomic coordinates of the codon encoding an amino-acid position.
 * Half-open `[start, end)` against the FAVOR-canonical chromosome (no
 * "chr" prefix). Width is typically 3 bp; `exon_split=true` flags codons
 * that straddle an exon junction. Absent when the protein accession isn't
 * in the RefSeq codon map (non-RefSeq targets, non-MANE-Select transcripts).
 */
export interface AaPosRegion {
  chromosome: string;
  start: number;
  end: number;
  strand: "+" | "-";
  exon_split: boolean;
}
