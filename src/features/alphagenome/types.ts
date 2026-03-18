// ─── Common ────────────────────────────────────────────────────

export interface JobResponse {
  job_id: string;
  status: "running" | "done" | "failed";
  poll_url: string;
  url?: string;
  cached?: boolean;
  error?: string;
}

export interface Prediction<T> {
  data: T;
  cached: boolean;
}

// ─── Modalities & Scorers ──────────────────────────────────────

export type Modality =
  | "cage"
  | "dnase"
  | "atac"
  | "rna_seq"
  | "chip_histone"
  | "chip_tf"
  | "splice_sites"
  | "splice_site_usage"
  | "splice_junctions"
  | "contact_maps";

export type ScorerKey =
  | "center_mask"
  | "contact_map"
  | "gene_mask_lfc"
  | "gene_mask_active"
  | "gene_mask_splicing"
  | "polyadenylation"
  | "splice_junction";

// ─── Region widths ─────────────────────────────────────────────

export type SupportedWidth = 16384 | 131072 | 524288 | 1048576;

// ─── Variant Tracks ────────────────────────────────────────────

export type TissueGroup =
  | "Brain"
  | "Immune"
  | "Cardiovascular"
  | "Connective"
  | "Digestive"
  | "Reproductive"
  | "Cell Line"
  | "Kidney"
  | "Skin"
  | "Lung"
  | "Eye"
  | "Muscle"
  | "Nerve"
  | "Liver"
  | "Endocrine"
  | "Pancreas"
  | "Stem Cell"
  | "Other";

export interface VariantTrackRequest {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  modalities?: Modality[];
  tissue_groups?: TissueGroup[];
}

export interface TrackMeta {
  track_name: string;
  biosample_name: string;
  ontology_curie?: string;
  data_source?: string;
  [key: string]: unknown;
}

export interface TrackData {
  values: number[][];
  tracks: TrackMeta[];
  resolution?: number;
  num_tracks?: number;
  num_positions?: number;
  interval?: { chromosome: string; start: number; end: number };
}

export interface VariantTrackResult {
  type: "variant";
  input: { chromosome: string; position: number; ref: string; alt: string };
  modalities: Modality[];
  reference: Partial<Record<Modality, TrackData>>;
  alternate: Partial<Record<Modality, TrackData>>;
}

// ─── Scores ────────────────────────────────────────────────────

export interface ScoreRequest {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  scorers?: ScorerKey[];
}

/** Row label: a gene (or junction) the scorer evaluates against. */
export interface ScoreRow {
  gene_id: string;
  gene_name: string;
  strand?: string;
  gene_type?: string;
}

/** Column label: a tissue/cell-type track with full metadata. */
export interface ScoreTrack {
  name: string;
  biosample_name: string;
  strand?: string;
  ontology_curie?: string;
  tissue_group?: string;
  biosample_type?: string;
  data_source?: string;
  [key: string]: unknown;
}

/** Overall variant impact classification. */
export interface OverallScore {
  quantile: number;
  raw: number;
  classification: string;
  method: string;
}

/** A top tissue hit from a scorer's summary. */
export interface TopTissueHit {
  raw_score: number;
  quantile_score: number;
  biosample_name: string;
  tissue_group?: string;
  gene_name: string;
}

/** Per-scorer summary with top tissue hits. */
export interface ScorerSummary {
  max_quantile: number;
  max_raw: number;
  top_tissues: TopTissueHit[];
}

/** One scorer block in the response. */
export interface ScorerBlock {
  scorer: string;
  rows: ScoreRow[];
  tracks: ScoreTrack[];
  /** raw_scores[row_i][track_j] — actual model output. */
  raw_scores: number[][];
  /** quantile_scores[row_i][track_j] — percentile 0-1, use for heatmap color. null if unavailable. */
  quantile_scores: number[][] | null;
  /** Pre-computed summary with top tissue hits. */
  summary?: ScorerSummary;
}

export interface ScoreResult {
  type: "scores";
  input: {
    chromosome: string;
    position: number;
    ref: string;
    alt: string;
    gene?: string | null;
  };
  /** Overall variant impact classification. */
  overall?: OverallScore;
  scorers: ScorerBlock[];
}

// ─── Region ────────────────────────────────────────────────────

export interface RegionRequest {
  chromosome: string;
  start: number;
  end: number;
  modalities?: Modality[];
}

/** Region result: modality data is at the top level (e.g. result.cage, result.dnase). */
export interface RegionResult {
  type: "region";
  input: { chromosome: string; start: number; end: number };
  modalities: Modality[];
  [modality: string]: TrackData | unknown;
}

// ─── Parsed VCF ────────────────────────────────────────────────

export interface ParsedVcf {
  chromosome: string; // with "chr" prefix
  position: number;
  ref: string;
  alt: string;
}

// ─── Display metadata ──────────────────────────────────────────

export interface ModalityMeta {
  id: Modality;
  label: string;
  resolution: string;
  description: string;
}

export interface ScorerMeta {
  id: ScorerKey;
  label: string;
  description: string;
}
