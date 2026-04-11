/**
 * IGVF Lipid Analysis — SQL + data layer.
 *
 * Architecture: ONE materialization pass (17-way JOIN), then per-dataset analytics.
 * Each experimental dataset (base editing, MPRA, finemapped, etc.) runs the full
 * analysis suite independently with its own significance definition.
 *
 * The analysis table has:
 *   - Prediction method flags (pred_apc, pred_chrombpnet, ...)
 *   - Per-dataset presence flags (has_be, has_encode_mpra, has_finemapped_glgc)
 *   - Per-dataset significance columns (either_sig, encode_mpra_sig, finemapped_sig)
 */

// ============================================================================
// Types
// ============================================================================

export type DatasetId = "base_editing" | "encode_mpra" | "finemapped_glgc";

export interface DatasetDef {
  id: DatasetId;
  label: string;
  /**
   * "within" — filter to dataset variants, test sigColumn within.
   * "enrichment" — use all variants as population, presence IS the positive class.
   */
  mode: "within" | "enrichment";
  sigColumn: string;
  presenceColumn: string;
  sigDescription: string;
  /** Column for z-score/logFC forest (null if N/A) */
  zColumn: string | null;
  /** Columns for Miami dual-pval plot (null if N/A) */
  pvalColumns: { upper: string; lower: string } | null;
}

export const DATASET_DEFS: DatasetDef[] = [
  {
    id: "base_editing",
    label: "Base Editing",
    mode: "within",
    sigColumn: "either_sig",
    presenceColumn: "has_be",
    sigDescription: "BH-adjusted efflux OR uptake FDR < 0.05",
    zColumn: "efflux_z",
    pvalColumns: { upper: "efflux_neglog_p", lower: "uptake_neglog_p" },
  },
  {
    id: "encode_mpra",
    label: "ENCODE MPRA",
    mode: "within",
    sigColumn: "encode_mpra_sig",
    presenceColumn: "has_encode_mpra",
    sigDescription: "MPRA FDR q < 0.05",
    zColumn: null,
    pvalColumns: null,
  },
  {
    id: "finemapped_glgc",
    label: "GLGC Finemapped",
    mode: "enrichment",
    sigColumn: "has_finemapped_glgc",
    presenceColumn: "has_finemapped_glgc",
    sigDescription: "Finemapped in GLGC (enrichment vs all IGVF variants)",
    zColumn: null,
    pvalColumns: null,
  },
];

export interface ForestRow {
  method: string;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  or: number;
  orLo: number;
  orHi: number;
  recall: number;
  recallLo: number;
  recallHi: number;
  precision: number;
  precisionLo: number;
  precisionHi: number;
  significant: boolean;
}

export interface LogfcRow {
  method: string;
  meanZ: number;
  lo: number;
  hi: number;
  n: number;
}

export interface SummaryRow {
  category: string;
  total: number;
  expSig: number;
  predFunc: number;
  predSig: number;
  apc: number;
  chrombpnet: number;
  clinvar: number;
  liver_cv2f: number;
  cv2f: number;
  liver_ase: number;
  ase: number;
  tland: number;
  meanDnase: number | null;
  meanH3k27ac: number | null;
  meanH3k4me3: number | null;
}

export interface UpsetRow {
  pred_apc: boolean;
  pred_chrombpnet: boolean;
  pred_clinvar: boolean;
  pred_liver_cv2f: boolean;
  pred_cv2f: boolean;
  pred_liver_ase: boolean;
  pred_ase: boolean;
  pred_liver_tland: boolean;
  count: number;
  expSigCount: number;
}

export interface MiamiPoint {
  chrom: number;
  position: number;
  upper_neglog_p: number | null;
  lower_neglog_p: number | null;
  predicted_functional: boolean;
  is_sig: boolean;
  encode_ccre: "Promoter" | "Enhancer" | "None";
  exonic_category: string | null;
  cage_category: "Promoter" | "Enhancer" | "Neither";
  encode_element: string;
  variant_category: "Coding" | "Noncoding";
  genes: string[];
}

export interface PRPoint {
  method: string;
  threshold: number;
  precision: number;
  recall: number;
}

export interface AfBoxplotRow {
  population: string;
  sigGroup: string;
  p5: number;
  q1: number;
  median: number;
  q3: number;
  p95: number;
  n: number;
}

/** Per-dataset sub-report */
export interface DatasetReport {
  dataset: DatasetDef;
  variantCount: number;
  sigCount: number;
  forest: ForestRow[];
  forestBackground: ForestRow[];
  jointForest: ForestRow[] | null;
  logfc: LogfcRow[];
  summary: SummaryRow[];
  summaryCage: SummaryRow[];
  upset: UpsetRow[];
  upsetCoding: UpsetRow[];
  upsetNoncoding: UpsetRow[];
  upsetSigOnly: UpsetRow[];
  miami: MiamiPoint[];
  geneList: string[];
  prCurves: PRPoint[];
}

// ============================================================================
// Cross-dataset types
// ============================================================================

export interface DhsSummaryRow {
  source: string;
  promoterCount: number;
  enhancerCount: number;
  promoterGenes: number;
  enhancerGenes: number;
}

export interface GwasContextRow {
  source: string;
  total: number;
  genomeWideSig: number;
  nominalSig: number;
  minP: number;
}

export interface ColocSummaryRow {
  totalVariants: number;
  totalColocs: number;
  totalTraits: number;
  totalTissues: number;
  avgMaxVcp: number;
}

export interface FinemapSummaryRow {
  trait: string;
  n: number;
  avgUkbFinemap: number | null;
  avgUkbSusie: number | null;
  avgBbjFinemap: number | null;
  avgBbjSusie: number | null;
}

export interface BaselineRate {
  method: string;
  count: number;
  rate: number;
}

export interface CrossDatasetData {
  afBoxplot: AfBoxplotRow[];
  dhsSummary: DhsSummaryRow[];
  gwasContext: GwasContextRow[];
  colocSummary: ColocSummaryRow | null;
  finemapSummary: FinemapSummaryRow[];
  baselineRates: BaselineRate[] | null;
  /** Per-method prediction counts for the cohort (for baseline comparison) */
  cohortPredCounts: Record<string, number>;
  cohortTotal: number;
}

/** Top-level report */
export interface IgvfReportData {
  totalVariants: number;
  availableDatasets: DatasetId[];
  reports: Partial<Record<DatasetId, DatasetReport>>;
  loadedTables: Array<{ label: string; rows: number }>;
  crossDataset: CrossDatasetData;
}

// ============================================================================
// Prediction methods (shared across all datasets)
// ============================================================================

/**
 * 10M background prediction rates from IGVF static analysis.
 * Source: s3://batch/static/analysis_igvf_lipid/baseline_rates.json
 * Total variants: 9,830,335 (Eric Van Buren, validated 2026-03-20)
 */
export const IGVF_BASELINE = {
  totalVariants: 9830335,
  rates: {
    pred_overall: { count: 1362259, rate: 0.138577 },
    pred_apc: { count: 368739, rate: 0.03751 },
    pred_macie: { count: 409134, rate: 0.04162 },
    pred_clinvar: { count: 279, rate: 0.000028 },
    pred_liver_ase: { count: 40050, rate: 0.004074 },
    pred_ase: { count: 62264, rate: 0.006334 },
    pred_chrombpnet: { count: 149545, rate: 0.015213 },
    pred_liver_tland: { count: 481370, rate: 0.048968 },
    pred_liver_cv2f: { count: 246812, rate: 0.025107 },
    pred_cv2f: { count: 228143, rate: 0.023208 },
  } as Record<string, { count: number; rate: number }>,
} as const;

/** Prediction methods — used for forest plots, upset, and joint model. */
const PRED_METHODS = [
  ["Overall", "pred_overall"],
  ["aPC", "pred_apc"],
  ["ClinVar", "pred_clinvar"],
  ["liver_ASE", "pred_liver_ase"],
  ["ASE", "pred_ase"],
  ["chromBPnet", "pred_chrombpnet"],
  ["liver_TLand", "pred_liver_tland"],
  ["liver_cV2F", "pred_liver_cv2f"],
  ["cV2F", "pred_cv2f"],
] as const;

const UPSET_COLS = PRED_METHODS.filter(([, c]) => c !== "pred_overall")
  .map(([, c]) => c)
  .join(", ");

// ============================================================================
// BH FDR correction (Benjamini-Hochberg)
// ============================================================================

function bhAdjust(pvals: number[]): number[] {
  const n = pvals.length;
  if (n === 0) return [];
  const indexed = pvals.map((p, i) => ({ i, p }));
  indexed.sort((a, b) => a.p - b.p);
  const adjusted = new Array<number>(n);
  let cumMin = 1;
  for (let k = n - 1; k >= 0; k--) {
    const rank = k + 1;
    const bh = (indexed[k].p * n) / rank;
    cumMin = Math.min(cumMin, bh);
    adjusted[indexed[k].i] = Math.min(1, cumMin);
  }
  return adjusted;
}

// ============================================================================
// SQL — Materialization
// ============================================================================

export const SQL_MATERIALIZE = `
CREATE OR REPLACE TABLE analysis AS
WITH tland_p95 AS (
  SELECT COALESCE(APPROX_QUANTILE(tland_liver, 0.95), 999) as val FROM tland_liver
),
mpra_agg AS (
  SELECT vid, MAX(neg_log10_qvalue) as max_qval, MAX(log2fc) as max_log2fc
  FROM mpra_oligos GROUP BY vid
),
-- Pre-aggregate tables with duplicate VIDs to prevent row multiplication
dhs_mgh_agg AS (
  SELECT vid, MAX(DHS_promoter) as DHS_promoter, MAX(DHS_enhancer) as DHS_enhancer
  FROM dhs_overlap_mgh GROUP BY vid
),
dhs_unc_agg AS (
  SELECT vid, MAX(DHS_promoter) as DHS_promoter, MAX(DHS_enhancer) as DHS_enhancer
  FROM dhs_overlap_unc GROUP BY vid
)
SELECT
  v.vid, v.variant_vcf, v.chromosome, v.position,

  -- Dataset presence flags
  be.vid IS NOT NULL     as has_be,
  mp.vid IS NOT NULL     as has_encode_mpra,
  fm.vid IS NOT NULL     as has_finemapped_glgc,
  mo.vid IS NOT NULL     as has_mpra_oligos,

  -- Base editing raw p-values (FDR in JS)
  be.ldl_efflux_p as efflux_p, be.ldl_uptake_p as uptake_p,
  be.ldl_efflux_mu_z_adj as efflux_z, be.ldl_uptake_mu_z_adj as uptake_z,

  -- ENCODE MPRA raw score
  mp.neg_log10_qvalue as encode_mpra_qvalue,
  mp.log2fc as encode_mpra_log2fc,

  -- MPRA oligos aggregated score
  mo.max_qval as mpra_oligos_qvalue,
  mo.max_log2fc as mpra_oligos_log2fc,

  -- Finemapped GLGC
  fm.ln_bf as finemapped_ln_bf,

  -- Prediction method flags
  GREATEST(
    COALESCE(v.apc.protein_function_v3, 0), COALESCE(v.apc.conservation_v2, 0),
    COALESCE(v.apc.epigenetics_active, 0), COALESCE(v.apc.epigenetics_repressed, 0),
    COALESCE(v.apc.epigenetics_transcription, 0), COALESCE(v.apc.transcription_factor, 0)
  ) > 20 as pred_apc,

  GREATEST(
    COALESCE(v.apc.protein_function_v3, 0), COALESCE(v.apc.conservation_v2, 0),
    COALESCE(v.apc.epigenetics_active, 0), COALESCE(v.apc.epigenetics_repressed, 0),
    COALESCE(v.apc.epigenetics_transcription, 0), COALESCE(v.apc.transcription_factor, 0)
  ) as apc_max_score,

  cb.min_pval as chrombpnet_pval, cb.max_abs_logfc as chrombpnet_logfc,
  cv.cv2f_liver as cv2f_liver_score, cv.cv2f_global_max as cv2f_global_score,
  a.ase_liver_neglog_p as ase_liver_score, a.ase_overall_max_neglog_p as ase_overall_score,
  tl.tland_liver as tland_liver_score,

  COALESCE(cb.min_pval < 0.01 AND cb.has_peak_overlap = 1, false) as pred_chrombpnet,
  COALESCE(cv.cv2f_liver > 0.75, false)      as pred_liver_cv2f,
  COALESCE(cv.cv2f_global_max > 0.75, false) as pred_cv2f,
  COALESCE(a.ase_liver_neglog_p >= 4, false)         as pred_liver_ase,
  COALESCE(a.ase_overall_max_neglog_p >= 4, false)   as pred_ase,
  COALESCE(tl.tland_liver >= tp95.val, false)         as pred_liver_tland,

  (
    len(list_filter(v.clinvar.clnsig,
      x -> x IS NOT NULL AND (lower(CAST(x AS VARCHAR)) LIKE '%pathogenic%' OR lower(CAST(x AS VARCHAR)) = 'drug_response')
        AND lower(CAST(x AS VARCHAR)) NOT LIKE '%benign%'
    )) > 0
    OR (COALESCE(v.dbnsfp.metasvm_pred, '') = 'D' AND v.genecode.consequence IS NOT NULL
        AND lower(v.genecode.consequence) LIKE '%nonsynonymous%')
  ) as pred_clinvar,

  -- DHS overlap flags (pre-aggregated to prevent row multiplication)
  COALESCE(dmgh.DHS_promoter = 1, false) as pred_dhs_mgh_promoter,
  COALESCE(dmgh.DHS_enhancer = 1, false) as pred_dhs_mgh_enhancer,
  COALESCE(dunc.DHS_promoter = 1, false) as pred_dhs_unc_promoter,
  COALESCE(dunc.DHS_enhancer = 1, false) as pred_dhs_unc_enhancer,

  -- Categories
  CASE WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%PLS%' THEN 'Promoter'
       WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%ELS%' THEN 'Enhancer' ELSE 'None' END as encode_ccre,
  CASE WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%PLS%' THEN 'PLS'
       WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%pELS%' THEN 'pELS'
       WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%dELS%' THEN 'dELS'
       WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%CTCF%' THEN 'CTCF-only'
       WHEN CAST(v.ccre.annotations AS VARCHAR) LIKE '%DNase%' THEN 'DNase-H3K4me3' ELSE 'None' END as encode_element,
  CASE WHEN v.cage.cage_promoter IS NOT NULL AND v.cage.cage_promoter != '' THEN 'Promoter'
       WHEN v.cage.cage_enhancer IS NOT NULL AND v.cage.cage_enhancer != '' THEN 'Enhancer' ELSE 'Neither' END as cage_category,
  CASE WHEN lower(COALESCE(v.genecode.consequence,'')) LIKE '%stopgain%' OR lower(COALESCE(v.genecode.consequence,'')) LIKE '%stoploss%'
         OR lower(COALESCE(v.genecode.consequence,'')) LIKE '%frameshift%' THEN 'pLoF'
       WHEN lower(COALESCE(v.genecode.consequence,'')) LIKE '%nonsynonymous%' THEN 'Missense'
       WHEN lower(COALESCE(v.genecode.consequence,'')) LIKE '%synonymous%' THEN 'Synonymous' ELSE NULL END as exonic_category,
  CASE WHEN v.genecode.consequence IS NOT NULL AND (lower(v.genecode.consequence) LIKE '%nonsynonymous%' OR lower(v.genecode.consequence) LIKE '%stopgain%'
    OR lower(v.genecode.consequence) LIKE '%stoploss%' OR lower(v.genecode.consequence) LIKE '%frameshift%'
    OR lower(v.genecode.consequence) LIKE '%synonymous%') THEN 'Coding' ELSE 'Noncoding' END as variant_category,

  v.genecode.genes as genes, v.genecode.region_type as region_type, v.genecode.consequence as consequence,
  v.epigenetic_phred.dnase as dnase_phred, v.epigenetic_phred.h3k27ac as h3k27ac_phred, v.epigenetic_phred.h3k4me3 as h3k4me3_phred,
  v.gnomad_genome.populations.afr.af as af_afr, v.gnomad_genome.populations.amr.af as af_amr,
  v.gnomad_genome.populations.eas.af as af_eas, v.gnomad_genome.populations.nfe.af as af_nfe,
  v.gnomad_genome.populations.sas.af as af_sas, v.gnomad_genome.af as af_global

FROM variants v
LEFT JOIN base_editing be      ON be.vid = v.vid
LEFT JOIN chrombpnet_liver cb  ON cb.vid = v.vid
LEFT JOIN cv2f cv              ON cv.vid = v.vid
LEFT JOIN ase a                ON a.vid = v.vid
LEFT JOIN tland_liver tl       ON tl.vid = v.vid
LEFT JOIN finemapped_glgc fm   ON fm.vid = v.vid
LEFT JOIN dhs_mgh_agg dmgh    ON dmgh.vid = v.vid
LEFT JOIN dhs_unc_agg dunc    ON dunc.vid = v.vid
LEFT JOIN mpra mp              ON mp.vid = v.vid
LEFT JOIN mpra_agg mo          ON mo.vid = v.vid
CROSS JOIN tland_p95 tp95
WHERE v.status = 'FOUND'
`;

// ============================================================================
// Post-materialization: FDR + threshold passes
// ============================================================================

const SQL_ASSIGN_IDX = `
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS _be_idx INTEGER;
  UPDATE analysis SET _be_idx = sub.rn
  FROM (SELECT vid, ROW_NUMBER() OVER (ORDER BY vid) as rn FROM analysis WHERE has_be) sub
  WHERE analysis.vid = sub.vid;
`;

const SQL_RAW_PVALS = `
SELECT _be_idx, efflux_p, uptake_p FROM analysis WHERE has_be ORDER BY _be_idx
`;

function buildFdrUpdate(
  rows: Array<{
    idx: number;
    efflux_fdr: number;
    uptake_fdr: number;
    either_sig: boolean;
    pred_overall: boolean;
  }>,
): string {
  const values = rows
    .map(
      (r) =>
        `(${r.idx}, ${r.efflux_fdr}, ${r.uptake_fdr}, ${r.either_sig}, ${r.pred_overall})`,
    )
    .join(",\n");

  return `
    CREATE OR REPLACE TEMP TABLE _fdr AS
    SELECT * FROM (VALUES ${values}) AS t(_be_idx, efflux_fdr, uptake_fdr, either_sig, pred_overall);

    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS efflux_fdr DOUBLE;
    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS uptake_fdr DOUBLE;
    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS either_sig BOOLEAN DEFAULT false;
    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS pred_overall BOOLEAN DEFAULT false;
    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS efflux_neglog_p DOUBLE;
    ALTER TABLE analysis ADD COLUMN IF NOT EXISTS uptake_neglog_p DOUBLE;

    UPDATE analysis SET
      efflux_fdr = f.efflux_fdr, uptake_fdr = f.uptake_fdr,
      either_sig = f.either_sig, pred_overall = f.pred_overall,
      efflux_neglog_p = -log10(NULLIF(f.efflux_fdr, 0)),
      uptake_neglog_p = -log10(NULLIF(f.uptake_fdr, 0))
    FROM _fdr f WHERE analysis._be_idx = f._be_idx;
    DROP TABLE _fdr;
  `;
}

/** Threshold pass for non-base-editing datasets + global pred_overall */
const SQL_THRESHOLD_PASS = `
  -- Ensure columns exist even when base-editing path (buildFdrUpdate) was skipped
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS pred_overall BOOLEAN DEFAULT false;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS either_sig BOOLEAN DEFAULT false;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS efflux_fdr DOUBLE;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS uptake_fdr DOUBLE;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS efflux_neglog_p DOUBLE;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS uptake_neglog_p DOUBLE;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS encode_mpra_sig BOOLEAN DEFAULT false;
  ALTER TABLE analysis ADD COLUMN IF NOT EXISTS finemapped_sig BOOLEAN DEFAULT false;

  UPDATE analysis SET
    encode_mpra_sig = COALESCE(encode_mpra_qvalue >= 1.30103, false)
  WHERE has_encode_mpra;

  UPDATE analysis SET
    finemapped_sig = COALESCE(finemapped_ln_bf > 0, false)
  WHERE has_finemapped_glgc;

  -- Compute pred_overall for ALL variants (FDR step only sets it for BE variants)
  UPDATE analysis SET pred_overall = (
    pred_apc OR pred_chrombpnet OR pred_clinvar OR pred_liver_cv2f OR pred_cv2f
    OR pred_liver_ase OR pred_ase OR pred_liver_tland
  ) WHERE NOT pred_overall;
`;

// ============================================================================
// Parameterized analytics queries
// ============================================================================

/** Safely append AND clause to a WHERE that may be empty (enrichment mode). */
function andWhere(where: string, clause: string): string {
  return where ? `${where} AND ${clause}` : `WHERE ${clause}`;
}

function forestSQL(where: string, sigCol: string): string {
  return (
    `SELECT method, sort_order, tp, fp, fn, tn FROM (\n` +
    PRED_METHODS.map(
      ([name, col], i) =>
        `  SELECT '${name}' as method, ${i} as sort_order,
    count(*) FILTER (WHERE ${col} AND ${sigCol}) as tp,
    count(*) FILTER (WHERE ${col} AND NOT ${sigCol}) as fp,
    count(*) FILTER (WHERE NOT ${col} AND ${sigCol}) as fn,
    count(*) FILTER (WHERE NOT ${col} AND NOT ${sigCol}) as tn
  FROM analysis ${where}`,
    ).join("\n  UNION ALL ") +
    "\n) sub ORDER BY sort_order"
  );
}

function logfcSQL(where: string, zCol: string): string {
  return PRED_METHODS.map(
    ([name, col], i) =>
      `SELECT '${name}' as method, ${i} as sort_order,
    AVG(${zCol}) FILTER (WHERE ${col}) as mean_z,
    STDDEV(${zCol}) FILTER (WHERE ${col}) as sd_z,
    COUNT(*) FILTER (WHERE ${col}) as n
  FROM analysis ${where}`,
  ).join("\n  UNION ALL ");
}

function summarySQL(where: string, sigCol: string): string {
  return `
SELECT variant_category as category,
  count(*) as total, count(*) FILTER (WHERE ${sigCol}) as exp_sig,
  count(*) FILTER (WHERE pred_overall) as pred_func,
  count(*) FILTER (WHERE pred_overall AND ${sigCol}) as pred_sig,
  count(*) FILTER (WHERE pred_apc) as apc, count(*) FILTER (WHERE pred_chrombpnet) as chrombpnet,
  count(*) FILTER (WHERE pred_clinvar) as clinvar,
  count(*) FILTER (WHERE pred_liver_cv2f) as liver_cv2f, count(*) FILTER (WHERE pred_cv2f) as cv2f,
  count(*) FILTER (WHERE pred_liver_ase) as liver_ase, count(*) FILTER (WHERE pred_ase) as ase,
  count(*) FILTER (WHERE pred_liver_tland) as tland,
  AVG(dnase_phred) as mean_dnase, AVG(h3k27ac_phred) as mean_h3k27ac, AVG(h3k4me3_phred) as mean_h3k4me3
FROM analysis ${where} GROUP BY variant_category ORDER BY variant_category`;
}

function summaryCageSQL(where: string, sigCol: string): string {
  return summarySQL(andWhere(where, "variant_category = 'Noncoding'"), sigCol)
    .replace("variant_category as category", "cage_category as category")
    .replace("GROUP BY variant_category", "GROUP BY cage_category")
    .replace("ORDER BY variant_category", "ORDER BY cage_category");
}

function upsetSQL(where: string, sigCol: string): string {
  return `SELECT ${UPSET_COLS}, count(*) as n, count(*) FILTER (WHERE ${sigCol}) as n_sig
FROM analysis ${where}
GROUP BY ${UPSET_COLS} HAVING count(*) >= 1 ORDER BY n DESC`;
}

function miamiSQL(
  where: string,
  upperCol: string | null,
  lowerCol: string | null,
  sigCol: string,
): string {
  const upper = upperCol ?? "NULL";
  const lower = lowerCol ?? "NULL";
  return `SELECT
  CASE WHEN chromosome LIKE 'chr%' THEN CAST(replace(replace(replace(chromosome,'chrX','23'),'chrY','24'),'chr','') AS INTEGER)
       ELSE CAST(replace(replace(chromosome,'X','23'),'Y','24') AS INTEGER) END as chrom,
  position, ${upper} as upper_neglog_p, ${lower} as lower_neglog_p,
  pred_overall as predicted_functional, COALESCE(${sigCol}, false) as is_sig, encode_ccre,
  exonic_category, cage_category, encode_element, variant_category, genes
FROM analysis ${where} ORDER BY chrom, position`;
}

function geneListSQL(where: string): string {
  return `SELECT gene, count(*) as n FROM (
  SELECT unnest(genes) as gene FROM analysis ${andWhere(where, "genes IS NOT NULL AND len(genes) > 0")}
) GROUP BY gene HAVING count(*) >= 3 ORDER BY n DESC LIMIT 50`;
}

function prRawSQL(where: string, sigCol: string): string {
  return `SELECT ${sigCol} as is_sig, apc_max_score,
  CASE WHEN chrombpnet_pval IS NOT NULL THEN -log10(NULLIF(chrombpnet_pval, 0)) ELSE NULL END as chrombpnet_score,
  cv2f_liver_score, cv2f_global_score, ase_liver_score, ase_overall_score, tland_liver_score
FROM analysis ${where}`;
}

// ============================================================================
// Stats
// ============================================================================

function wilsonCI(x: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = x / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - m), Math.min(1, c + m)];
}

function computeOR(
  method: string,
  tp: number,
  fp: number,
  fn: number,
  tn: number,
): ForestRow {
  const a = tp + 0.5,
    b = fp + 0.5,
    c = fn + 0.5,
    d = tn + 0.5;
  const or = (a * d) / (b * c);
  const logOR = Math.log(or);
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const [recallLo, recallHi] = wilsonCI(tp, tp + fn);
  const [precisionLo, precisionHi] = wilsonCI(tp, tp + fp);
  return {
    method,
    tp,
    fp,
    fn,
    tn,
    or,
    orLo: Math.exp(logOR - 1.96 * se),
    orHi: Math.exp(logOR + 1.96 * se),
    recall,
    recallLo,
    recallHi,
    precision,
    precisionLo,
    precisionHi,
    significant:
      Math.exp(logOR - 1.96 * se) > 1 || Math.exp(logOR + 1.96 * se) < 1,
  };
}

// ============================================================================
// Joint logistic regression (IRLS)
// ============================================================================

function fitJointLogistic(
  y: boolean[],
  X: boolean[][],
  methodNames: string[],
): ForestRow[] | null {
  const n = y.length;
  const p = X[0]?.length ?? 0;
  if (n < 30 || p === 0) return null;

  // Filter columns: need variance AND enough positives.
  // Ridge regularization (below) handles quasi-complete separation.
  const MIN_POS = 3;
  const colUsable = Array.from({ length: p }, (_, j) => {
    let nTrue = 0,
      nFalse = 0;
    for (let i = 0; i < n; i++) {
      if (X[i][j]) nTrue++;
      else nFalse++;
    }
    return nTrue >= MIN_POS && nFalse > 0;
  });
  const activeIdxs = colUsable
    .map((v, i) => (v ? i : -1))
    .filter((i) => i >= 0);
  // Need at least 2 active predictors — with 1, joint = marginal (no value added)
  if (activeIdxs.length < 2) return null;

  // Add intercept: design matrix is [1, active_x1, active_x2, ...]
  const cols = activeIdxs.length + 1;
  const Xm: number[][] = y.map((_, i) => [
    1,
    ...activeIdxs.map((j) => (X[i][j] ? 1 : 0)),
  ]);
  const yv = y.map((v) => (v ? 1 : 0));

  // Initialize coefficients to 0
  const beta = new Array(cols).fill(0);

  // IRLS iterations
  for (let iter = 0; iter < 25; iter++) {
    // Compute predicted probabilities
    const mu = Xm.map((row) => {
      const eta = row.reduce((s, x, j) => s + x * beta[j], 0);
      return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, eta))));
    });

    // W = diag(mu * (1 - mu)), z = eta + (y - mu) / (mu * (1-mu))
    // Solve X'WX * delta = X'(y - mu) via normal equations
    const XtWX: number[][] = Array.from({ length: cols }, () =>
      new Array(cols).fill(0),
    );
    const Xty_mu = new Array(cols).fill(0);

    // Ridge penalty λ — N(0, 1/λ) prior on coefficients (skip intercept)
    // Prevents divergence with sparse predictors / quasi-complete separation
    const lambda = 0.5;

    for (let i = 0; i < n; i++) {
      const w = mu[i] * (1 - mu[i]) + 1e-10;
      const r = yv[i] - mu[i];
      for (let j = 0; j < cols; j++) {
        Xty_mu[j] += Xm[i][j] * r;
        for (let k = j; k < cols; k++) {
          XtWX[j][k] += Xm[i][j] * Xm[i][k] * w;
          if (k !== j) XtWX[k][j] = XtWX[j][k];
        }
      }
    }

    // Add ridge penalty to information matrix and gradient (skip intercept)
    for (let j = 1; j < cols; j++) {
      XtWX[j][j] += lambda;
      Xty_mu[j] -= lambda * beta[j];
    }

    // Solve via Gaussian elimination
    const delta = solveLinear(XtWX, Xty_mu);
    if (!delta) return null; // singular

    let maxDelta = 0;
    for (let j = 0; j < cols; j++) {
      beta[j] += delta[j];
      maxDelta = Math.max(maxDelta, Math.abs(delta[j]));
    }
    if (maxDelta < 1e-8) break;
  }

  // Standard errors from inverse of X'WX (Fisher information)
  const mu = Xm.map((row) => {
    const eta = row.reduce((s, x, j) => s + x * beta[j], 0);
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, eta))));
  });
  const info: number[][] = Array.from({ length: cols }, () =>
    new Array(cols).fill(0),
  );
  for (let i = 0; i < n; i++) {
    const w = mu[i] * (1 - mu[i]) + 1e-10;
    for (let j = 0; j < cols; j++)
      for (let k = j; k < cols; k++) {
        info[j][k] += Xm[i][j] * Xm[i][k] * w;
        if (k !== j) info[k][j] = info[j][k];
      }
  }
  // Add ridge to Fisher information for consistent SE estimation
  const lambda = 0.5;
  for (let j = 1; j < cols; j++) info[j][j] += lambda;
  const cov = invertMatrix(info);
  if (!cov) return null;

  // Extract results — map active columns back to all methods
  // activeIdxs maps design column (1-based after intercept) to original method index
  return methodNames.map((name, origIdx) => {
    const activePos = activeIdxs.indexOf(origIdx);
    if (activePos < 0) {
      // Zero-variance column — no data, OR = 1
      return {
        method: name,
        tp: 0,
        fp: 0,
        fn: 0,
        tn: 0,
        or: 1,
        orLo: 1,
        orHi: 1,
        recall: 0,
        recallLo: 0,
        recallHi: 0,
        precision: 0,
        precisionLo: 0,
        precisionHi: 0,
        significant: false,
      };
    }
    const betaIdx = activePos + 1; // +1 for intercept
    const b = beta[betaIdx];
    const se = Math.sqrt(Math.max(0, cov[betaIdx][betaIdx]));
    const or = Math.exp(b);
    return {
      method: name,
      tp: 0,
      fp: 0,
      fn: 0,
      tn: 0,
      or,
      orLo: Math.exp(b - 1.96 * se),
      orHi: Math.exp(b + 1.96 * se),
      recall: 0,
      recallLo: 0,
      recallHi: 0,
      precision: 0,
      precisionLo: 0,
      precisionHi: 0,
      significant: Math.exp(b - 1.96 * se) > 1 || Math.exp(b + 1.96 * se) < 1,
    };
  });
}

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const aug = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

// ============================================================================
// PR Curve computation
// ============================================================================

interface PRRawRow {
  is_sig: boolean;
  [key: string]: unknown;
}

const PR_METHODS: Array<{ name: string; scoreKey: string }> = [
  { name: "aPC", scoreKey: "apc_max_score" },
  { name: "chromBPnet", scoreKey: "chrombpnet_score" },
  { name: "liver_cV2F", scoreKey: "cv2f_liver_score" },
  { name: "cV2F", scoreKey: "cv2f_global_score" },
  { name: "liver_ASE", scoreKey: "ase_liver_score" },
  { name: "ASE", scoreKey: "ase_overall_score" },
  { name: "liver_TLand", scoreKey: "tland_liver_score" },
];

function computePRCurves(rows: PRRawRow[]): PRPoint[] {
  const points: PRPoint[] = [];
  for (const { name, scoreKey } of PR_METHODS) {
    const scored = rows
      .filter((r) => typeof r[scoreKey] === "number")
      .map((r) => ({ sig: !!r.is_sig, score: r[scoreKey] as number }));
    if (scored.length < 2) continue;
    scored.sort((a, b) => b.score - a.score);
    const totalPos = scored.filter((s) => s.sig).length;
    if (totalPos === 0) continue;
    let tp = 0,
      fp = 0;
    const step = Math.max(1, Math.floor(scored.length / 50));
    for (let i = 0; i < scored.length; i++) {
      if (scored[i].sig) tp++;
      else fp++;
      if (i % step === 0 || i === scored.length - 1) {
        points.push({
          method: name,
          threshold: scored[i].score,
          precision: tp / (tp + fp),
          recall: tp / totalPos,
        });
      }
    }
  }
  return points;
}

// ============================================================================
// Variant List (for interactive drawer)
// ============================================================================

export interface VariantFilter {
  label: string;
  sql: string;
}

export function variantListSQL(whereBody: string): string {
  return `SELECT
    vid, variant_vcf, chromosome, position, genes, region_type, consequence, variant_category, exonic_category,
    encode_ccre, cage_category, encode_element,
    pred_overall, pred_apc, pred_chrombpnet, pred_clinvar,
    pred_liver_cv2f, pred_cv2f, pred_liver_ase, pred_ase, pred_liver_tland,
    COALESCE(either_sig, false) as either_sig,
    COALESCE(encode_mpra_sig, false) as encode_mpra_sig,
    COALESCE(finemapped_sig, false) as finemapped_sig,
    efflux_p, uptake_p, efflux_fdr, uptake_fdr, efflux_z, uptake_z,
    encode_mpra_qvalue, encode_mpra_log2fc,
    finemapped_ln_bf,
    apc_max_score, chrombpnet_pval,
    cv2f_liver_score, cv2f_global_score,
    ase_liver_score, ase_overall_score,
    tland_liver_score,
    dnase_phred, h3k27ac_phred, h3k4me3_phred,
    af_afr, af_amr, af_eas, af_nfe, af_sas, af_global
  FROM analysis
  WHERE ${whereBody}
  ORDER BY
    CAST(replace(replace(replace(chromosome,'chrX','23'),'chrY','24'),'chr','') AS INTEGER),
    position
  LIMIT 1000`;
}

// ============================================================================
// Main
// ============================================================================

type QueryFn = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
function num(v: unknown, f = 0) {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  return f;
}
function numOrNull(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  return null;
}

function parseUpsetRows(rows: Record<string, unknown>[]): UpsetRow[] {
  return rows.map((r) => ({
    pred_apc: !!r.pred_apc,
    pred_chrombpnet: !!r.pred_chrombpnet,
    pred_clinvar: !!r.pred_clinvar,
    pred_liver_cv2f: !!r.pred_liver_cv2f,
    pred_cv2f: !!r.pred_cv2f,
    pred_liver_ase: !!r.pred_liver_ase,
    pred_ase: !!r.pred_ase,
    pred_liver_tland: !!r.pred_liver_tland,
    count: num(r.n),
    expSigCount: num(r.n_sig),
  }));
}

function parseSummaryRows(rows: Record<string, unknown>[]): SummaryRow[] {
  return rows.map((r) => ({
    category: r.category as string,
    total: num(r.total),
    expSig: num(r.exp_sig),
    predFunc: num(r.pred_func),
    predSig: num(r.pred_sig),
    apc: num(r.apc),
    chrombpnet: num(r.chrombpnet),
    clinvar: num(r.clinvar),
    liver_cv2f: num(r.liver_cv2f),
    cv2f: num(r.cv2f),
    liver_ase: num(r.liver_ase),
    ase: num(r.ase),
    tland: num(r.tland),
    meanDnase: numOrNull(r.mean_dnase),
    meanH3k27ac: numOrNull(r.mean_h3k27ac),
    meanH3k4me3: numOrNull(r.mean_h3k4me3),
  }));
}

function parseMiamiRows(rows: Record<string, unknown>[]): MiamiPoint[] {
  return rows.map((r) => ({
    chrom: num(r.chrom),
    position: num(r.position),
    upper_neglog_p:
      typeof r.upper_neglog_p === "number" ? r.upper_neglog_p : null,
    lower_neglog_p:
      typeof r.lower_neglog_p === "number" ? r.lower_neglog_p : null,
    predicted_functional: !!r.predicted_functional,
    is_sig: !!r.is_sig,
    encode_ccre: (r.encode_ccre as "Promoter" | "Enhancer" | "None") ?? "None",
    exonic_category: (r.exonic_category as string) ?? null,
    cage_category:
      (r.cage_category as "Promoter" | "Enhancer" | "Neither") ?? "Neither",
    encode_element: (r.encode_element as string) ?? "None",
    variant_category:
      (r.variant_category as "Coding" | "Noncoding") ?? "Noncoding",
    genes: Array.isArray(r.genes) ? (r.genes as string[]) : [],
  }));
}

async function buildDatasetReport(
  query: QueryFn,
  def: DatasetDef,
): Promise<DatasetReport> {
  // "within" mode: filter to dataset variants, test significance within
  // "enrichment" mode: all variants as population, presence IS the positive class
  const where = def.mode === "within" ? `WHERE ${def.presenceColumn}` : "";
  const sig = def.mode === "within" ? def.sigColumn : def.presenceColumn;

  const [
    forestR,
    forestBgR,
    summaryR,
    summaryCageR,
    upsetR,
    upsetCodingR,
    upsetNoncodingR,
    upsetSigR,
    miamiR,
    geneListR,
    prRawR,
    countsR,
    jointDataR,
  ] = await Promise.all([
    query(forestSQL(where, sig)),
    query(forestSQL("", sig)),
    query(summarySQL(where, sig)),
    query(summaryCageSQL(where, sig)),
    query(upsetSQL(where, sig)),
    query(upsetSQL(andWhere(where, "variant_category = 'Coding'"), sig)),
    query(upsetSQL(andWhere(where, "variant_category = 'Noncoding'"), sig)),
    query(upsetSQL(andWhere(where, sig), sig)),
    query(
      miamiSQL(
        where,
        def.pvalColumns?.upper ?? null,
        def.pvalColumns?.lower ?? null,
        sig,
      ),
    ),
    query(geneListSQL(where)),
    query(prRawSQL(where, sig)),
    query(
      `SELECT count(*) as n, count(*) FILTER (WHERE ${sig}) as sig FROM analysis ${where}`,
    ),
    // Fetch data for joint regression
    query(
      `SELECT ${sig} as is_sig, ${PRED_METHODS.filter(
        ([, c]) => c !== "pred_overall",
      )
        .map(([, c]) => c)
        .join(", ")} FROM analysis ${where}`,
    ),
  ]);

  const toForest = (rows: Record<string, unknown>[]) =>
    rows.map((r) =>
      computeOR(r.method as string, num(r.tp), num(r.fp), num(r.fn), num(r.tn)),
    );

  // Joint logistic regression
  const methodNames = PRED_METHODS.filter(([, c]) => c !== "pred_overall").map(
    ([n]) => n,
  );
  const methodCols = PRED_METHODS.filter(([, c]) => c !== "pred_overall").map(
    ([, c]) => c,
  );
  const yArr = jointDataR.rows.map((r) => !!r.is_sig);
  const xArr = jointDataR.rows.map((r) => methodCols.map((c) => !!r[c]));
  const jointForest = fitJointLogistic(yArr, xArr, methodNames);

  // LogFC (only for datasets with z-score column)
  let logfc: LogfcRow[] = [];
  if (def.zColumn) {
    const logfcR = await query(logfcSQL(where, def.zColumn));
    logfc = logfcR.rows.map((r) => {
      const mean = num(r.mean_z);
      const sd = num(r.sd_z);
      const n = num(r.n, 1);
      const se = sd / Math.sqrt(n);
      return {
        method: r.method as string,
        meanZ: mean,
        lo: mean - 1.96 * se,
        hi: mean + 1.96 * se,
        n,
      };
    });
  }

  return {
    dataset: def,
    variantCount: num(countsR.rows[0]?.n),
    sigCount: num(countsR.rows[0]?.sig),
    forest: toForest(forestR.rows),
    forestBackground: toForest(forestBgR.rows),
    jointForest,
    logfc,
    summary: parseSummaryRows(summaryR.rows),
    summaryCage: parseSummaryRows(summaryCageR.rows),
    upset: parseUpsetRows(upsetR.rows),
    upsetCoding: parseUpsetRows(upsetCodingR.rows),
    upsetNoncoding: parseUpsetRows(upsetNoncodingR.rows),
    upsetSigOnly: parseUpsetRows(upsetSigR.rows),
    miami: parseMiamiRows(miamiR.rows),
    geneList: geneListR.rows.map((r) => r.gene as string),
    prCurves: computePRCurves(prRawR.rows as PRRawRow[]),
  };
}

// ============================================================================
// Cross-dataset queries
// ============================================================================

const SQL_DHS_SUMMARY = `
SELECT 'MGH' as source,
  count(*) FILTER (WHERE DHS_promoter = 1) as promoter_count,
  count(*) FILTER (WHERE DHS_enhancer = 1) as enhancer_count,
  count(DISTINCT promoter_linked_gene) FILTER (WHERE promoter_linked_gene IS NOT NULL AND promoter_linked_gene != '') as promoter_genes,
  count(DISTINCT enhancer_linked_gene) FILTER (WHERE enhancer_linked_gene IS NOT NULL AND enhancer_linked_gene != '') as enhancer_genes
FROM dhs_overlap_mgh
UNION ALL
SELECT 'UNC',
  count(*) FILTER (WHERE DHS_promoter = 1),
  count(*) FILTER (WHERE DHS_enhancer = 1),
  count(DISTINCT promoter_linked_gene) FILTER (WHERE promoter_linked_gene IS NOT NULL AND promoter_linked_gene != ''),
  count(DISTINCT enhancer_linked_gene) FILTER (WHERE enhancer_linked_gene IS NOT NULL AND enhancer_linked_gene != '')
FROM dhs_overlap_unc`;

const SQL_GWAS_CONTEXT = `
SELECT 'UKB LDL' as source, count(*) as total,
  count(*) FILTER (WHERE pvalue < 5e-8) as genome_wide_sig,
  count(*) FILTER (WHERE pvalue < 0.05) as nominal_sig,
  MIN(pvalue) as min_p
FROM gwas_ukb_ldl
UNION ALL
SELECT 'TOPMed LDL', count(*), count(*) FILTER (WHERE pvalue < 5e-8), count(*) FILTER (WHERE pvalue < 0.05), MIN(pvalue)
FROM gwas_topmed_ldl`;

const SQL_COLOC_SUMMARY = `
SELECT CAST(count(*) AS BIGINT) as total_variants,
  CAST(COALESCE(SUM(CAST(coloc_count AS BIGINT)), 0) AS BIGINT) as total_colocs,
  CAST(COALESCE(SUM(CAST(coloc_traits AS BIGINT)), 0) AS BIGINT) as total_traits,
  CAST(COALESCE(SUM(CAST(coloc_tissues AS BIGINT)), 0) AS BIGINT) as total_tissues,
  AVG(coloc_max_vcp) as avg_max_vcp
FROM coloc`;

const SQL_FINEMAP_SUMMARY = `
SELECT trait, count(*) as n,
  AVG(finemappingscore_UKB_FINEMAP) as avg_ukb_finemap,
  AVG(finemappingscore_UKB_SUSIE) as avg_ukb_susie,
  AVG(finemappingscore_BBJ_FINEMAP) as avg_bbj_finemap,
  AVG(finemappingscore_BBJ_SUSIE) as avg_bbj_susie
FROM finemapped_topmed GROUP BY trait ORDER BY n DESC`;

const SQL_AF_BOXPLOT_CROSS = `
SELECT population, sig_group,
  APPROX_QUANTILE(af, 0.05) as p5, APPROX_QUANTILE(af, 0.25) as q1,
  APPROX_QUANTILE(af, 0.5) as median, APPROX_QUANTILE(af, 0.75) as q3,
  APPROX_QUANTILE(af, 0.95) as p95, COUNT(*) as n
FROM (
  SELECT 'AFR' as population, af_afr as af, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END as sig_group FROM analysis WHERE af_afr IS NOT NULL
  UNION ALL SELECT 'AMR', af_amr, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END FROM analysis WHERE af_amr IS NOT NULL
  UNION ALL SELECT 'EAS', af_eas, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END FROM analysis WHERE af_eas IS NOT NULL
  UNION ALL SELECT 'NFE', af_nfe, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END FROM analysis WHERE af_nfe IS NOT NULL
  UNION ALL SELECT 'SAS', af_sas, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END FROM analysis WHERE af_sas IS NOT NULL
  UNION ALL SELECT 'Global', af_global, CASE WHEN pred_overall THEN 'Pred. Functional' ELSE 'Not predicted' END FROM analysis WHERE af_global IS NOT NULL
) unpivoted
GROUP BY population, sig_group ORDER BY population, sig_group`;

async function buildCrossDataset(
  query: QueryFn,
  baselineRates: BaselineRate[] | null,
): Promise<CrossDatasetData> {
  const predCountSQL = `SELECT count(*) as total, ${PRED_METHODS.map(
    ([, col]) => `count(*) FILTER (WHERE ${col}) as ${col}`,
  ).join(", ")} FROM analysis`;
  const [dhsR, gwasR, colocR, finemapR, afR, predR] = await Promise.all([
    query(SQL_DHS_SUMMARY),
    query(SQL_GWAS_CONTEXT),
    query(SQL_COLOC_SUMMARY),
    query(SQL_FINEMAP_SUMMARY),
    query(SQL_AF_BOXPLOT_CROSS),
    query(predCountSQL),
  ]);

  const dhsSummary: DhsSummaryRow[] = dhsR.rows.map((r) => ({
    source: r.source as string,
    promoterCount: num(r.promoter_count),
    enhancerCount: num(r.enhancer_count),
    promoterGenes: num(r.promoter_genes),
    enhancerGenes: num(r.enhancer_genes),
  }));

  const gwasContext: GwasContextRow[] = gwasR.rows.map((r) => ({
    source: r.source as string,
    total: num(r.total),
    genomeWideSig: num(r.genome_wide_sig),
    nominalSig: num(r.nominal_sig),
    minP: num(r.min_p, 1),
  }));

  const cr = colocR.rows[0];
  const colocSummary: ColocSummaryRow | null =
    cr && num(cr.total_variants) > 0
      ? {
          totalVariants: num(cr.total_variants),
          totalColocs: num(cr.total_colocs),
          totalTraits: num(cr.total_traits),
          totalTissues: num(cr.total_tissues),
          avgMaxVcp: num(cr.avg_max_vcp),
        }
      : null;

  const finemapSummary: FinemapSummaryRow[] = finemapR.rows.map((r) => ({
    trait: r.trait as string,
    n: num(r.n),
    avgUkbFinemap: numOrNull(r.avg_ukb_finemap),
    avgUkbSusie: numOrNull(r.avg_ukb_susie),
    avgBbjFinemap: numOrNull(r.avg_bbj_finemap),
    avgBbjSusie: numOrNull(r.avg_bbj_susie),
  }));

  const afBoxplot: AfBoxplotRow[] = afR.rows.map((r) => ({
    population: r.population as string,
    sigGroup: r.sig_group as string,
    p5: num(r.p5),
    q1: num(r.q1),
    median: num(r.median),
    q3: num(r.q3),
    p95: num(r.p95),
    n: num(r.n),
  }));

  const pr = predR.rows[0] ?? {};
  const cohortTotal = num(pr.total);
  const cohortPredCounts: Record<string, number> = {};
  for (const [, col] of PRED_METHODS) cohortPredCounts[col] = num(pr[col]);

  return {
    afBoxplot,
    dhsSummary,
    gwasContext,
    colocSummary,
    finemapSummary,
    baselineRates,
    cohortPredCounts,
    cohortTotal,
  };
}

export async function generateIgvfReport(
  query: QueryFn,
  loadedTables: Array<{ label: string; rows: number }>,
): Promise<IgvfReportData> {
  // Step 1: materialize
  await query(SQL_MATERIALIZE);

  // Step 2: base editing FDR (requires JS BH adjustment)
  await query(SQL_ASSIGN_IDX);
  const rawR = await query(SQL_RAW_PVALS);
  const effluxFdr = bhAdjust(rawR.rows.map((r) => num(r.efflux_p, 1)));
  const uptakeFdr = bhAdjust(rawR.rows.map((r) => num(r.uptake_p, 1)));

  const flagsR = await query(`
    SELECT _be_idx, ${PRED_METHODS.filter(([, c]) => c !== "pred_overall")
      .map(([, c]) => c)
      .join(", ")}
    FROM analysis WHERE has_be ORDER BY _be_idx
  `);

  const predCols = PRED_METHODS.filter(([, c]) => c !== "pred_overall").map(
    ([, c]) => c,
  );
  const fdrRows = rawR.rows.map((r, i) => {
    const flags = flagsR.rows[i];
    return {
      idx: num(r._be_idx),
      efflux_fdr: effluxFdr[i],
      uptake_fdr: uptakeFdr[i],
      either_sig: effluxFdr[i] < 0.05 || uptakeFdr[i] < 0.05,
      pred_overall: predCols.some((c) => !!flags?.[c]),
    };
  });
  if (fdrRows.length > 0) await query(buildFdrUpdate(fdrRows));

  // Step 3: threshold pass for non-BE datasets
  await query(SQL_THRESHOLD_PASS);

  // Step 4: auto-detect available datasets
  const countsR = await query(`SELECT
    count(*) as total,
    count(*) FILTER (WHERE has_be) as n_be,
    count(*) FILTER (WHERE has_encode_mpra) as n_encode_mpra,
    count(*) FILTER (WHERE has_finemapped_glgc) as n_finemapped
  FROM analysis`);
  const c = countsR.rows[0];

  const MIN_VARIANTS = 10;
  const available: DatasetId[] = [];
  if (num(c?.n_be) >= MIN_VARIANTS) available.push("base_editing");
  if (num(c?.n_encode_mpra) >= MIN_VARIANTS) available.push("encode_mpra");
  if (num(c?.n_finemapped) >= MIN_VARIANTS) available.push("finemapped_glgc");

  // Step 5: build sub-reports + cross-dataset in parallel
  const reports: Partial<Record<DatasetId, DatasetReport>> = {};
  const reportPromises = available.map(async (id) => {
    const def = DATASET_DEFS.find((d) => d.id === id)!;
    reports[id] = await buildDatasetReport(query, def);
  });
  const baselineRates: BaselineRate[] = Object.entries(IGVF_BASELINE.rates).map(
    ([method, { count, rate }]) => ({ method, count, rate }),
  );
  const crossDatasetPromise = buildCrossDataset(query, baselineRates);
  const [, crossDataset] = await Promise.all([
    Promise.all(reportPromises),
    crossDatasetPromise,
  ]);

  return {
    totalVariants: num(c?.total),
    availableDatasets: available,
    reports,
    loadedTables,
    crossDataset,
  };
}
