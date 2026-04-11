/**
 * SQL queries and data processing for the variant list analytics report.
 * Pure data layer — no React, no display logic.
 */

import {
  clinicalSignificance,
  reviewStatus,
} from "@features/variant/config/hg38/columns/clinvar";
import {
  gencodeComprehensive,
  gencodeExonic,
} from "@features/variant/config/hg38/columns/functional-class";
import { alphaMissense as alphaMissenseDef } from "@features/variant/config/hg38/columns/protein-function";
import type { Variant } from "@features/variant/types";

// ============================================================================
// Types
// ============================================================================

/** Chart-ready slice for pie/donut charts */
export interface ChartSlice {
  name: string;
  value: number;
  fill: string;
}

/** Ranked item for bar charts */
export interface RankedItem {
  name: string;
  value: number;
}

/** Score distribution for box plots */
export interface ScoreDistribution {
  id: string;
  label: string;
  p5: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  p95: number | null;
  highImpactCount: number;
  highImpactLabel: string;
}

/** Row for stacked AF × functional category chart */
export interface AfByFunctionRow {
  category: string;
  [afBin: string]: number | string;
}

/** One box plot within a faceted panel */
export interface RegCategoryBox {
  category: string;
  p5: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  p95: number | null;
}

/** A panel in the faceted score × regulatory box plot grid */
export interface ScoreByRegulatoryPanel {
  score: string;
  color: string;
  boxes: RegCategoryBox[];
}

export type PrioritizedVariant = Variant & { priority_score: number };

export interface ReportData {
  totalVariants: number;

  summary: {
    clinvarPLP: { count: number; pct: number };
    ultraRare: { count: number; pct: number };
    highImpact: { count: number; pct: number };
    cosmicHits: number;
    spliceHigh: number;
    regulatoryActive: { count: number; pct: number };
    qcPassPct: number | null;
  };

  regionType: ChartSlice[];
  consequence: ChartSlice[];
  afSpectrum: ChartSlice[];

  topGenes: RankedItem[];
  geneHancerTargets: RankedItem[];

  scores: ScoreDistribution[];

  /** AF bin proportions within each functional category (stacked bar) */
  afByFunction: AfByFunctionRow[];

  /** Score distributions across regulatory categories (faceted box plots) */
  scoresByRegulatory: ScoreByRegulatoryPanel[];

  clinvarSignificance: ChartSlice[];
  clinvarReviewStatus: ChartSlice[];
  topDiseases: RankedItem[];
  totalWithClinvar: number;

  alphaMissense: ChartSlice[];
  topMissenseGenes: RankedItem[];
  totalMissense: number;

  takeaways: string[];
  prioritizedVariants: PrioritizedVariant[];
}

// ============================================================================
// Color Map — Tailwind 500-level hex for SVG fills
// ============================================================================

const HEX: Record<string, string> = {
  stone: "#78716c",
  rose: "#f43f5e",
  amber: "#f59e0b",
  green: "#22c55e",
  orange: "#f97316",
  sky: "#0ea5e9",
  yellow: "#eab308",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  lime: "#84cc16",
  indigo: "#6366f1",
  red: "#ef4444",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  purple: "#a855f7",
  emerald: "#10b981",
  pink: "#ec4899",
  fuchsia: "#d946ef",
  gray: "#9ca3af",
};

export const AF_BINS = [
  "Absent",
  "Ultra-rare",
  "Very rare",
  "Rare",
  "Low freq",
  "Common",
] as const;

export const AF_COLORS: Record<string, string> = {
  Absent: HEX.stone,
  "Ultra-rare": HEX.violet,
  "Very rare": HEX.blue,
  Rare: HEX.sky,
  "Low freq": HEX.teal,
  Common: HEX.emerald,
};

// ============================================================================
// SQL Queries
// ============================================================================

const SQL = {
  /**
   * Single-pass summary — combines all COUNT-based metrics into one table scan.
   * 8 individual queries → 1 query.
   */
  summary: `
    SELECT
      COUNT(*) as total,

      -- ClinVar P/LP
      COUNT(CASE WHEN len(list_filter(
        variants.clinvar.clnsig,
        x -> x IS NOT NULL
          AND lower(CAST(x AS VARCHAR)) LIKE '%pathogenic%'
          AND lower(CAST(x AS VARCHAR)) NOT LIKE '%benign%'
      )) > 0 THEN 1 END) as clinvar_plp,

      -- Ultra-rare (max AF < 0.001)
      COUNT(CASE WHEN GREATEST(
        COALESCE(variants.gnomad_exome.af, 0),
        COALESCE(variants.gnomad_genome.af, 0),
        COALESCE(variants.bravo.bravo_af, 0)
      ) < 0.001 THEN 1 END) as ultra_rare,

      -- COSMIC hits
      COUNT(CASE WHEN variants.cosmic.sample_count IS NOT NULL
        AND variants.cosmic.sample_count > 0 THEN 1 END) as cosmic_hits,

      -- Splice-disrupting (SpliceAI/Pangolin >= 0.5)
      COUNT(CASE WHEN GREATEST(
        COALESCE(variants.gnomad_exome.functional.spliceai_ds_max, 0),
        COALESCE(variants.gnomad_genome.functional.spliceai_ds_max, 0),
        COALESCE(variants.gnomad_genome.functional.pangolin_largest_ds, 0)
      ) >= 0.5 THEN 1 END) as splice_high,

      -- Regulatory active
      COUNT(CASE WHEN (
        COALESCE(variants.apc.epigenetics_active, 0) >= 10
        OR COALESCE(variants.main.encode.dnase.phred, 0) >= 10
        OR COALESCE(variants.main.encode.h3k27ac.phred, 0) >= 10
        OR (variants.ccre.annotations IS NOT NULL AND variants.ccre.annotations != '')
      ) THEN 1 END) as regulatory_active,

      -- QC PASS rate
      COUNT(CASE WHEN variants.bravo.filter_status IS NOT NULL
        AND contains(CAST(variants.bravo.filter_status AS VARCHAR), 'PASS') THEN 1 END) as qc_pass,
      COUNT(CASE WHEN variants.bravo.filter_status IS NOT NULL THEN 1 END) as qc_total,

      -- ClinVar total (any clnsig)
      COUNT(CASE WHEN len(list_filter(
        variants.clinvar.clnsig, x -> x IS NOT NULL AND x != ''
      )) > 0 THEN 1 END) as clinvar_total,

      -- Total with ClinVar annotations
      COUNT(CASE WHEN variants.clinvar.clnsig IS NOT NULL
        AND len(variants.clinvar.clnsig) > 0 THEN 1 END) as with_clinvar,

      -- Total missense
      COUNT(CASE WHEN variants.genecode.consequence IS NOT NULL
        AND lower(variants.genecode.consequence) LIKE '%nonsynonymous%' THEN 1 END) as total_missense

    FROM variants
    WHERE status = 'FOUND'
  `,

  highImpact: `
    WITH scored AS (
      SELECT GREATEST(
        COALESCE(variants.apc.conservation_v2, 0),
        COALESCE(variants.apc.protein_function_v3, 0),
        COALESCE(variants.main.cadd.phred, 0) / 2
      ) as integrative_max
      FROM variants
      WHERE status = 'FOUND'
    ),
    threshold AS (
      SELECT APPROX_QUANTILE(integrative_max, 0.99) as p99 FROM scored
    )
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM scored) as percentage
    FROM scored, threshold
    WHERE integrative_max >= threshold.p99
  `,

  regionDistribution: `
    SELECT
      COALESCE(variants.genecode.region_type, 'Unknown') as region_type,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE status = 'FOUND'), 2) as percentage
    FROM variants
    WHERE status = 'FOUND'
    GROUP BY region_type
    ORDER BY count DESC
  `,

  consequenceDistribution: `
    SELECT
      COALESCE(variants.genecode.consequence, 'Unknown') as consequence,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE status = 'FOUND'), 2) as percentage
    FROM variants
    WHERE status = 'FOUND'
      AND variants.genecode.consequence IS NOT NULL
      AND variants.genecode.consequence != ''
    GROUP BY consequence
    ORDER BY count DESC
    LIMIT 10
  `,

  afSpectrum: `
    WITH af_data AS (
      SELECT GREATEST(
        COALESCE(variants.gnomad_exome.af, 0),
        COALESCE(variants.gnomad_genome.af, 0),
        COALESCE(variants.bravo.bravo_af, 0)
      ) as max_af
      FROM variants
      WHERE status = 'FOUND'
    ),
    binned AS (
      SELECT
        CASE
          WHEN max_af = 0 THEN 'Absent'
          WHEN max_af < 0.0001 THEN 'Ultra-rare'
          WHEN max_af < 0.001 THEN 'Very rare'
          WHEN max_af < 0.01 THEN 'Rare'
          WHEN max_af < 0.05 THEN 'Low freq'
          ELSE 'Common'
        END as bin,
        CASE
          WHEN max_af = 0 THEN 0
          WHEN max_af < 0.0001 THEN 1
          WHEN max_af < 0.001 THEN 2
          WHEN max_af < 0.01 THEN 3
          WHEN max_af < 0.05 THEN 4
          ELSE 5
        END as bin_order
      FROM af_data
    )
    SELECT bin, COUNT(*) as count
    FROM binned
    GROUP BY bin, bin_order
    ORDER BY bin_order
  `,

  topGenesByVariantCount: `
    WITH gene_list AS (
      SELECT variants.genecode.genes as genes
      FROM variants
      WHERE status = 'FOUND'
        AND variants.genecode.genes IS NOT NULL
        AND len(variants.genecode.genes) > 0
    ),
    unnested AS (
      SELECT unnest(genes) as gene FROM gene_list
    )
    SELECT gene, COUNT(*) as variant_count
    FROM unnested
    WHERE gene IS NOT NULL AND gene != ''
    GROUP BY gene
    ORDER BY variant_count DESC
    LIMIT 10
  `,

  topGeneHancerTargets: `
    WITH targets_list AS (
      SELECT variants.genehancer.targets as targets
      FROM variants
      WHERE status = 'FOUND'
        AND variants.genehancer IS NOT NULL
        AND variants.genehancer.targets IS NOT NULL
        AND len(variants.genehancer.targets) > 0
    ),
    unnested AS (
      SELECT unnest(targets) as target FROM targets_list
    )
    SELECT
      target.gene as gene,
      ROUND(SUM(target.score), 3) as total_score,
      COUNT(*) as variant_count
    FROM unnested
    WHERE target.gene IS NOT NULL
    GROUP BY target.gene
    ORDER BY variant_count DESC, total_score DESC
    LIMIT 10
  `,

  scoreDistributions: `
    SELECT
      -- CADD
      APPROX_QUANTILE(variants.main.cadd.phred, 0.05) as cadd_p5,
      APPROX_QUANTILE(variants.main.cadd.phred, 0.25) as cadd_q1,
      APPROX_QUANTILE(variants.main.cadd.phred, 0.5) as cadd_median,
      APPROX_QUANTILE(variants.main.cadd.phred, 0.75) as cadd_q3,
      APPROX_QUANTILE(variants.main.cadd.phred, 0.95) as cadd_p95,
      COUNT(CASE WHEN variants.main.cadd.phred >= 20 THEN 1 END) as cadd_high,
      -- LINSIGHT
      APPROX_QUANTILE(variants.linsight, 0.05) as linsight_p5,
      APPROX_QUANTILE(variants.linsight, 0.25) as linsight_q1,
      APPROX_QUANTILE(variants.linsight, 0.5) as linsight_median,
      APPROX_QUANTILE(variants.linsight, 0.75) as linsight_q3,
      APPROX_QUANTILE(variants.linsight, 0.95) as linsight_p95,
      COUNT(CASE WHEN variants.linsight >= 0.5 THEN 1 END) as linsight_high,
      -- FATHMM-XF
      APPROX_QUANTILE(variants.fathmm_xf, 0.05) as fathmm_p5,
      APPROX_QUANTILE(variants.fathmm_xf, 0.25) as fathmm_q1,
      APPROX_QUANTILE(variants.fathmm_xf, 0.5) as fathmm_median,
      APPROX_QUANTILE(variants.fathmm_xf, 0.75) as fathmm_q3,
      APPROX_QUANTILE(variants.fathmm_xf, 0.95) as fathmm_p95,
      COUNT(CASE WHEN variants.fathmm_xf >= 0.5 THEN 1 END) as fathmm_high,
      -- aPC Protein Function
      APPROX_QUANTILE(variants.apc.protein_function_v3, 0.05) as apc_pf_p5,
      APPROX_QUANTILE(variants.apc.protein_function_v3, 0.25) as apc_pf_q1,
      APPROX_QUANTILE(variants.apc.protein_function_v3, 0.5) as apc_pf_median,
      APPROX_QUANTILE(variants.apc.protein_function_v3, 0.75) as apc_pf_q3,
      APPROX_QUANTILE(variants.apc.protein_function_v3, 0.95) as apc_pf_p95,
      COUNT(CASE WHEN variants.apc.protein_function_v3 >= 10 THEN 1 END) as apc_pf_high,
      -- aPC Conservation
      APPROX_QUANTILE(variants.apc.conservation_v2, 0.05) as apc_cons_p5,
      APPROX_QUANTILE(variants.apc.conservation_v2, 0.25) as apc_cons_q1,
      APPROX_QUANTILE(variants.apc.conservation_v2, 0.5) as apc_cons_median,
      APPROX_QUANTILE(variants.apc.conservation_v2, 0.75) as apc_cons_q3,
      APPROX_QUANTILE(variants.apc.conservation_v2, 0.95) as apc_cons_p95,
      COUNT(CASE WHEN variants.apc.conservation_v2 >= 10 THEN 1 END) as apc_cons_high,
      -- aPC Epigenetics Active
      APPROX_QUANTILE(variants.apc.epigenetics_active, 0.05) as apc_epi_p5,
      APPROX_QUANTILE(variants.apc.epigenetics_active, 0.25) as apc_epi_q1,
      APPROX_QUANTILE(variants.apc.epigenetics_active, 0.5) as apc_epi_median,
      APPROX_QUANTILE(variants.apc.epigenetics_active, 0.75) as apc_epi_q3,
      APPROX_QUANTILE(variants.apc.epigenetics_active, 0.95) as apc_epi_p95,
      COUNT(CASE WHEN variants.apc.epigenetics_active >= 10 THEN 1 END) as apc_epi_high
    FROM variants
    WHERE status = 'FOUND'
  `,

  clinSigDistribution: `
    WITH clinvar_variants AS (
      SELECT variants.clinvar.clnsig[1] as clnsig
      FROM variants
      WHERE status = 'FOUND'
        AND variants.clinvar.clnsig IS NOT NULL
        AND len(variants.clinvar.clnsig) > 0
        AND variants.clinvar.clnsig[1] IS NOT NULL
    ),
    total AS (
      SELECT COUNT(*) as n FROM clinvar_variants
    )
    SELECT
      clnsig,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / total.n, 2) as percentage
    FROM clinvar_variants, total
    GROUP BY clnsig, total.n
    ORDER BY count DESC
    LIMIT 10
  `,

  reviewStatusDistribution: `
    WITH clinvar_variants AS (
      SELECT variants.clinvar.clnrevstat as review_status
      FROM variants
      WHERE status = 'FOUND'
        AND variants.clinvar.clnrevstat IS NOT NULL
        AND variants.clinvar.clnrevstat != ''
    ),
    total AS (
      SELECT COUNT(*) as n FROM clinvar_variants
    )
    SELECT
      review_status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / total.n, 2) as percentage
    FROM clinvar_variants, total
    GROUP BY review_status, total.n
    ORDER BY count DESC
    LIMIT 10
  `,

  topDiseases: `
    WITH disease_list AS (
      SELECT variants.clinvar.clndn as diseases
      FROM variants
      WHERE status = 'FOUND'
        AND variants.clinvar.clndn IS NOT NULL
        AND len(variants.clinvar.clndn) > 0
    ),
    unnested AS (
      SELECT unnest(diseases) as disease FROM disease_list
    )
    SELECT
      disease,
      COUNT(*) as count
    FROM unnested
    WHERE disease IS NOT NULL
      AND disease != ''
      AND lower(disease) != 'not_provided'
      AND lower(disease) != 'not_specified'
    GROUP BY disease
    ORDER BY count DESC
    LIMIT 15
  `,

  totalWithClinvar: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE status = 'FOUND'
      AND variants.clinvar.clnsig IS NOT NULL
      AND len(variants.clinvar.clnsig) > 0
  `,

  alphaMissenseDistribution: `
    WITH am_variants AS (
      SELECT
        CASE
          WHEN variants.alphamissense.max_pathogenicity > 0.564 THEN 'Likely Pathogenic'
          WHEN variants.alphamissense.max_pathogenicity >= 0.34 THEN 'Ambiguous'
          WHEN variants.alphamissense.max_pathogenicity IS NOT NULL THEN 'Likely Benign'
          ELSE NULL
        END as am_class
      FROM variants
      WHERE status = 'FOUND'
        AND variants.alphamissense.max_pathogenicity IS NOT NULL
    ),
    total AS (
      SELECT COUNT(*) as n FROM am_variants WHERE am_class IS NOT NULL
    )
    SELECT
      am_class,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / total.n, 2) as percentage
    FROM am_variants, total
    WHERE am_class IS NOT NULL
    GROUP BY am_class, total.n
    ORDER BY
      CASE am_class
        WHEN 'Likely Pathogenic' THEN 1
        WHEN 'Ambiguous' THEN 2
        WHEN 'Likely Benign' THEN 3
      END
  `,

  topMissenseGenes: `
    WITH missense_variants AS (
      SELECT variants.genecode.genes as genes
      FROM variants
      WHERE status = 'FOUND'
        AND variants.genecode.consequence IS NOT NULL
        AND lower(variants.genecode.consequence) LIKE '%nonsynonymous%'
        AND variants.genecode.genes IS NOT NULL
        AND len(variants.genecode.genes) > 0
    ),
    unnested AS (
      SELECT unnest(genes) as gene FROM missense_variants
    )
    SELECT
      gene,
      COUNT(*) as variant_count
    FROM unnested
    WHERE gene IS NOT NULL AND gene != ''
    GROUP BY gene
    ORDER BY variant_count DESC
    LIMIT 10
  `,

  totalMissense: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE status = 'FOUND'
      AND variants.genecode.consequence IS NOT NULL
      AND lower(variants.genecode.consequence) LIKE '%nonsynonymous%'
  `,

  prioritizedVariants: `
    SELECT
      variants.chromosome,
      variants.position,
      variants.variant_vcf,
      variants.genecode.consequence,
      variants.clinvar.clnsig[1] as clnsig,
      variants.clinvar.clndn[1] as clndn,
      variants.cosmic.gene as cosmic_gene,
      variants.cosmic.sample_count as cosmic_count,
      variants.alphamissense.max_pathogenicity as am_score,
      variants.main.cadd.phred as cadd,
      (
        CASE WHEN len(list_filter(variants.clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0 THEN 1000 ELSE 0 END +
        CASE WHEN variants.cosmic.sample_count > 0 THEN 200 ELSE 0 END +
        COALESCE(variants.apc.protein_function_v3, 0) * 20 +
        COALESCE(variants.apc.conservation_v2, 0) * 10 +
        COALESCE(variants.alphamissense.max_pathogenicity, 0) * 100
      ) as priority_score
    FROM variants
    WHERE status = 'FOUND'
    ORDER BY priority_score DESC
    LIMIT 20
  `,

  cosmicMedian: `
    SELECT APPROX_QUANTILE(variants.cosmic.sample_count, 0.5) as median
    FROM variants
    WHERE status = 'FOUND'
      AND variants.cosmic.sample_count IS NOT NULL
      AND variants.cosmic.sample_count > 0
  `,

  topCosmicGene: `
    SELECT CAST(variants.cosmic.gene AS VARCHAR) as gene, COUNT(*) as count
    FROM variants
    WHERE status = 'FOUND' AND variants.cosmic.gene IS NOT NULL
    GROUP BY variants.cosmic.gene
    ORDER BY count DESC
    LIMIT 1
  `,

  clinvarTotal: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE status = 'FOUND'
      AND len(list_filter(variants.clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0
  `,

  /** Cross-tab: AF bin × functional category for stacked bar chart */
  afByFunction: `
    WITH categorized AS (
      SELECT
        CASE
          WHEN lower(COALESCE(variants.genecode.consequence, '')) LIKE '%stopgain%'
            OR lower(COALESCE(variants.genecode.consequence, '')) LIKE '%stoploss%'
            OR lower(COALESCE(variants.genecode.consequence, '')) LIKE '%frameshift%' THEN 'pLoF'
          WHEN lower(COALESCE(variants.genecode.consequence, '')) LIKE '%nonsynonymous%' THEN 'Missense'
          WHEN lower(COALESCE(variants.genecode.consequence, '')) LIKE '%synonymous%' THEN 'Synonymous'
          WHEN COALESCE(variants.genecode.region_type, '') IN ('upstream', 'downstream')
            OR variants.cage.cage_promoter IS NOT NULL THEN 'Promoter'
          WHEN variants.genehancer IS NOT NULL
            OR variants.cage.cage_enhancer IS NOT NULL THEN 'Enhancer'
          ELSE 'Other'
        END as func_cat,
        CASE
          WHEN GREATEST(COALESCE(variants.gnomad_exome.af, 0), COALESCE(variants.gnomad_genome.af, 0), COALESCE(variants.bravo.bravo_af, 0)) = 0 THEN 'Absent'
          WHEN GREATEST(COALESCE(variants.gnomad_exome.af, 0), COALESCE(variants.gnomad_genome.af, 0), COALESCE(variants.bravo.bravo_af, 0)) < 0.0001 THEN 'Ultra-rare'
          WHEN GREATEST(COALESCE(variants.gnomad_exome.af, 0), COALESCE(variants.gnomad_genome.af, 0), COALESCE(variants.bravo.bravo_af, 0)) < 0.001 THEN 'Very rare'
          WHEN GREATEST(COALESCE(variants.gnomad_exome.af, 0), COALESCE(variants.gnomad_genome.af, 0), COALESCE(variants.bravo.bravo_af, 0)) < 0.01 THEN 'Rare'
          WHEN GREATEST(COALESCE(variants.gnomad_exome.af, 0), COALESCE(variants.gnomad_genome.af, 0), COALESCE(variants.bravo.bravo_af, 0)) < 0.05 THEN 'Low freq'
          ELSE 'Common'
        END as af_bin
      FROM variants
      WHERE status = 'FOUND'
    )
    SELECT func_cat, af_bin, COUNT(*) as count
    FROM categorized
    GROUP BY func_cat, af_bin
  `,

  /** Score distributions by regulatory category for faceted box plots */
  scoresByRegulatory: `
    WITH reg_cat AS (
      SELECT
        CASE
          WHEN variants.cage.cage_promoter IS NOT NULL THEN 'CAGE Promoter'
          WHEN variants.cage.cage_enhancer IS NOT NULL THEN 'CAGE Enhancer'
          WHEN variants.genehancer IS NOT NULL THEN 'GeneHancer'
          ELSE 'Non-regulatory'
        END as reg,
        variants.main.cadd.phred as cadd,
        variants.linsight as linsight,
        variants.fathmm_xf as fathmm,
        variants.apc.conservation_v2 as apc_cons,
        variants.apc.epigenetics_active as apc_epi,
        variants.apc.protein_function_v3 as apc_pf
      FROM variants
      WHERE status = 'FOUND'
    )
    SELECT
      reg,
      -- CADD
      APPROX_QUANTILE(cadd, 0.05) as cadd_p5, APPROX_QUANTILE(cadd, 0.25) as cadd_q1,
      APPROX_QUANTILE(cadd, 0.5) as cadd_med, APPROX_QUANTILE(cadd, 0.75) as cadd_q3,
      APPROX_QUANTILE(cadd, 0.95) as cadd_p95,
      -- LINSIGHT
      APPROX_QUANTILE(linsight, 0.05) as linsight_p5, APPROX_QUANTILE(linsight, 0.25) as linsight_q1,
      APPROX_QUANTILE(linsight, 0.5) as linsight_med, APPROX_QUANTILE(linsight, 0.75) as linsight_q3,
      APPROX_QUANTILE(linsight, 0.95) as linsight_p95,
      -- FATHMM-XF
      APPROX_QUANTILE(fathmm, 0.05) as fathmm_p5, APPROX_QUANTILE(fathmm, 0.25) as fathmm_q1,
      APPROX_QUANTILE(fathmm, 0.5) as fathmm_med, APPROX_QUANTILE(fathmm, 0.75) as fathmm_q3,
      APPROX_QUANTILE(fathmm, 0.95) as fathmm_p95,
      -- aPC Conservation
      APPROX_QUANTILE(apc_cons, 0.05) as apc_cons_p5, APPROX_QUANTILE(apc_cons, 0.25) as apc_cons_q1,
      APPROX_QUANTILE(apc_cons, 0.5) as apc_cons_med, APPROX_QUANTILE(apc_cons, 0.75) as apc_cons_q3,
      APPROX_QUANTILE(apc_cons, 0.95) as apc_cons_p95,
      -- aPC Epigenetics
      APPROX_QUANTILE(apc_epi, 0.05) as apc_epi_p5, APPROX_QUANTILE(apc_epi, 0.25) as apc_epi_q1,
      APPROX_QUANTILE(apc_epi, 0.5) as apc_epi_med, APPROX_QUANTILE(apc_epi, 0.75) as apc_epi_q3,
      APPROX_QUANTILE(apc_epi, 0.95) as apc_epi_p95,
      -- aPC Protein Function
      APPROX_QUANTILE(apc_pf, 0.05) as apc_pf_p5, APPROX_QUANTILE(apc_pf, 0.25) as apc_pf_q1,
      APPROX_QUANTILE(apc_pf, 0.5) as apc_pf_med, APPROX_QUANTILE(apc_pf, 0.75) as apc_pf_q3,
      APPROX_QUANTILE(apc_pf, 0.95) as apc_pf_p95
    FROM reg_cat
    GROUP BY reg
    ORDER BY CASE reg
      WHEN 'CAGE Promoter' THEN 1
      WHEN 'CAGE Enhancer' THEN 2
      WHEN 'GeneHancer' THEN 3
      ELSE 4
    END
  `,
};

// ============================================================================
// Helpers
// ============================================================================

interface CategoryDef {
  items: Array<{ label: string; match: string | RegExp; color: string }>;
}

function mapToSlices(
  raw: Array<{ label: string; count: number }>,
  categories: CategoryDef,
): ChartSlice[] {
  return categories.items
    .map((cat) => {
      const entry = raw.find((d) => {
        if (cat.match instanceof RegExp) return cat.match.test(d.label);
        return d.label.toLowerCase() === String(cat.match).toLowerCase();
      });
      return {
        name: cat.label,
        value: entry?.count ?? 0,
        fill: HEX[cat.color] ?? HEX.gray,
      };
    })
    .filter((s) => s.value > 0);
}

function num(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function numOrNull(val: unknown): number | null {
  return typeof val === "number" ? val : null;
}

function formatDiseaseName(name: string): string {
  let formatted = name.replace(/_/g, " ");
  formatted =
    formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  return formatted;
}

// ============================================================================
// Takeaways
// ============================================================================

function buildTakeaways(
  totalVariants: number,
  summary: ReportData["summary"],
  clinvarTotal: number,
  cosmicMedian: number | null,
  topCosmicGene: string | null,
): string[] {
  const out: string[] = [];
  const total = totalVariants;

  const clinvarPct =
    total > 0 ? ((clinvarTotal / total) * 100).toFixed(1) : "0";
  out.push(
    `${clinvarTotal.toLocaleString()} (${clinvarPct}%) variants have ClinVar interpretations; ${summary.clinvarPLP.count.toLocaleString()} are Pathogenic/Likely Pathogenic.`,
  );

  out.push(
    `${summary.ultraRare.pct.toFixed(1)}% of variants are ultra-rare (max AF < 1e-3) across gnomAD/BRAVO.`,
  );

  out.push(
    `${summary.highImpact.count.toLocaleString()} variants fall in the top 1% by integrative score.`,
  );

  if (summary.spliceHigh > 0) {
    out.push(
      `${summary.spliceHigh.toLocaleString()} variants have SpliceAI/Pangolin >= 0.5.`,
    );
  }

  if (summary.cosmicHits > 0) {
    const medianNote =
      cosmicMedian !== null
        ? ` (median sample count = ${cosmicMedian.toLocaleString()})`
        : "";
    const geneNote = topCosmicGene ? `, top gene: ${topCosmicGene}` : "";
    out.push(
      `${summary.cosmicHits.toLocaleString()} variants appear in COSMIC${medianNote}${geneNote}.`,
    );
  }

  return out.slice(0, 5);
}

// ============================================================================
// Main Data Generation
// ============================================================================

type QueryFn = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;

export async function generateReportData(query: QueryFn): Promise<ReportData> {
  // Fire all queries in parallel (DuckDB WASM is single-threaded, but this
  // avoids await-waterfall overhead). The consolidated summary query replaces
  // 8 individual COUNT scans → 1 scan.
  const [
    summaryR,
    highImpactR,
    regionR,
    consequenceR,
    afR,
    topGenesR,
    geneHancerR,
    scoresR,
    clinSigR,
    reviewR,
    diseasesR,
    amR,
    missenseGenesR,
    priorityR,
    cosmicMedianR,
    topCosmicR,
    afByFuncR,
    scoresByRegR,
  ] = await Promise.all([
    query(SQL.summary),
    query(SQL.highImpact),
    query(SQL.regionDistribution),
    query(SQL.consequenceDistribution),
    query(SQL.afSpectrum),
    query(SQL.topGenesByVariantCount),
    query(SQL.topGeneHancerTargets),
    query(SQL.scoreDistributions),
    query(SQL.clinSigDistribution),
    query(SQL.reviewStatusDistribution),
    query(SQL.topDiseases),
    query(SQL.alphaMissenseDistribution),
    query(SQL.topMissenseGenes),
    query(SQL.prioritizedVariants),
    query(SQL.cosmicMedian),
    query(SQL.topCosmicGene),
    query(SQL.afByFunction),
    query(SQL.scoresByRegulatory),
  ]);

  // Parse consolidated summary row
  const sr = summaryR.rows[0] ?? {};
  const totalVariants = num(sr.total);
  const pct = (count: number) =>
    totalVariants > 0 ? (count / totalVariants) * 100 : 0;

  const clinvarPLPCount = num(sr.clinvar_plp);
  const ultraRareCount = num(sr.ultra_rare);
  const cosmicHitsCount = num(sr.cosmic_hits);
  const spliceHighCount = num(sr.splice_high);
  const regulatoryActiveCount = num(sr.regulatory_active);
  const qcPass = num(sr.qc_pass);
  const qcTotal = num(sr.qc_total);
  const clinvarTotalCount = num(sr.clinvar_total);
  const withClinvarCount = num(sr.with_clinvar);
  const totalMissenseCount = num(sr.total_missense);

  const summary: ReportData["summary"] = {
    clinvarPLP: { count: clinvarPLPCount, pct: pct(clinvarPLPCount) },
    ultraRare: { count: ultraRareCount, pct: pct(ultraRareCount) },
    highImpact: {
      count: num(highImpactR.rows[0]?.count),
      pct: num(highImpactR.rows[0]?.percentage),
    },
    cosmicHits: cosmicHitsCount,
    spliceHigh: spliceHighCount,
    regulatoryActive: {
      count: regulatoryActiveCount,
      pct: pct(regulatoryActiveCount),
    },
    qcPassPct: qcTotal > 0 ? (qcPass / qcTotal) * 100 : null,
  };

  // Genomic distributions → chart slices
  const regionType = mapToSlices(
    regionR.rows.map((r) => ({
      label: r.region_type as string,
      count: num(r.count),
    })),
    gencodeComprehensive as CategoryDef,
  );

  const consequence = mapToSlices(
    consequenceR.rows.map((r) => ({
      label: r.consequence as string,
      count: num(r.count),
    })),
    gencodeExonic as CategoryDef,
  );

  // Allele frequency spectrum
  const afSpectrum: ChartSlice[] = afR.rows.map((r) => ({
    name: r.bin as string,
    value: num(r.count),
    fill: AF_COLORS[r.bin as string] ?? HEX.gray,
  }));

  // Gene burden
  const topGenes: RankedItem[] = topGenesR.rows.map((r) => ({
    name: r.gene as string,
    value: num(r.variant_count),
  }));
  const geneHancerTargets: RankedItem[] = geneHancerR.rows.map((r) => ({
    name: r.gene as string,
    value: num(r.variant_count),
  }));

  // Score distributions
  const scoreRow = scoresR.rows[0] ?? {};

  const scores: ScoreDistribution[] = [
    {
      id: "cadd",
      label: "CADD",
      p5: numOrNull(scoreRow.cadd_p5),
      q1: numOrNull(scoreRow.cadd_q1),
      median: numOrNull(scoreRow.cadd_median),
      q3: numOrNull(scoreRow.cadd_q3),
      p95: numOrNull(scoreRow.cadd_p95),
      highImpactCount: num(scoreRow.cadd_high),
      highImpactLabel: "≥ 20",
    },
    {
      id: "linsight",
      label: "LINSIGHT",
      p5: numOrNull(scoreRow.linsight_p5),
      q1: numOrNull(scoreRow.linsight_q1),
      median: numOrNull(scoreRow.linsight_median),
      q3: numOrNull(scoreRow.linsight_q3),
      p95: numOrNull(scoreRow.linsight_p95),
      highImpactCount: num(scoreRow.linsight_high),
      highImpactLabel: "≥ 0.5",
    },
    {
      id: "fathmm",
      label: "FATHMM-XF",
      p5: numOrNull(scoreRow.fathmm_p5),
      q1: numOrNull(scoreRow.fathmm_q1),
      median: numOrNull(scoreRow.fathmm_median),
      q3: numOrNull(scoreRow.fathmm_q3),
      p95: numOrNull(scoreRow.fathmm_p95),
      highImpactCount: num(scoreRow.fathmm_high),
      highImpactLabel: "≥ 0.5",
    },
    {
      id: "apc_pf",
      label: "aPC Protein Fn",
      p5: numOrNull(scoreRow.apc_pf_p5),
      q1: numOrNull(scoreRow.apc_pf_q1),
      median: numOrNull(scoreRow.apc_pf_median),
      q3: numOrNull(scoreRow.apc_pf_q3),
      p95: numOrNull(scoreRow.apc_pf_p95),
      highImpactCount: num(scoreRow.apc_pf_high),
      highImpactLabel: "≥ 10",
    },
    {
      id: "apc_cons",
      label: "aPC Conserv.",
      p5: numOrNull(scoreRow.apc_cons_p5),
      q1: numOrNull(scoreRow.apc_cons_q1),
      median: numOrNull(scoreRow.apc_cons_median),
      q3: numOrNull(scoreRow.apc_cons_q3),
      p95: numOrNull(scoreRow.apc_cons_p95),
      highImpactCount: num(scoreRow.apc_cons_high),
      highImpactLabel: "≥ 10",
    },
    {
      id: "apc_epi",
      label: "aPC Epigenetics",
      p5: numOrNull(scoreRow.apc_epi_p5),
      q1: numOrNull(scoreRow.apc_epi_q1),
      median: numOrNull(scoreRow.apc_epi_median),
      q3: numOrNull(scoreRow.apc_epi_q3),
      p95: numOrNull(scoreRow.apc_epi_p95),
      highImpactCount: num(scoreRow.apc_epi_high),
      highImpactLabel: "≥ 10",
    },
  ];

  // Clinical evidence
  const clinvarSignificance = mapToSlices(
    clinSigR.rows.map((r) => ({
      label: r.clnsig as string,
      count: num(r.count),
    })),
    clinicalSignificance as CategoryDef,
  );

  const clinvarReviewStatus = mapToSlices(
    reviewR.rows.map((r) => ({
      label: r.review_status as string,
      count: num(r.count),
    })),
    reviewStatus as CategoryDef,
  );

  const topDiseases: RankedItem[] = diseasesR.rows.map((r) => ({
    name: formatDiseaseName(r.disease as string),
    value: num(r.count),
  }));

  // Protein function
  const alphaMissense = mapToSlices(
    amR.rows.map((r) => ({ label: r.am_class as string, count: num(r.count) })),
    alphaMissenseDef as CategoryDef,
  );

  const topMissenseGenes: RankedItem[] = missenseGenesR.rows.map((r) => ({
    name: r.gene as string,
    value: num(r.variant_count),
  }));

  // AF × functional category (stacked bar)
  const funcCatOrder = [
    "pLoF",
    "Missense",
    "Synonymous",
    "Promoter",
    "Enhancer",
    "Other",
  ];
  const afByFuncRaw = afByFuncR.rows as Array<{
    func_cat: string;
    af_bin: string;
    count: number;
  }>;
  const afByFunction: AfByFunctionRow[] = funcCatOrder
    .map((cat) => {
      const catRows = afByFuncRaw.filter((r) => r.func_cat === cat);
      const total = catRows.reduce((s, r) => s + num(r.count), 0);
      if (total === 0) return null;
      const row: AfByFunctionRow = { category: cat };
      for (const bin of AF_BINS) {
        const found = catRows.find((r) => r.af_bin === bin);
        row[bin] = total > 0 ? num(found?.count) / total : 0;
      }
      return row;
    })
    .filter((r): r is AfByFunctionRow => r !== null);

  // Score × regulatory category (faceted box plots)
  const scoreConfigs = [
    { key: "cadd", label: "CADD", color: "#ef4444" },
    { key: "linsight", label: "LINSIGHT", color: "#f97316" },
    { key: "fathmm", label: "FATHMM-XF", color: "#78716c" },
    { key: "apc_cons", label: "aPC Conservation", color: "#8b5cf6" },
    { key: "apc_epi", label: "aPC Epigenetics", color: "#f59e0b" },
    { key: "apc_pf", label: "aPC Protein Fn", color: "#eab308" },
  ] as const;

  const scoresByRegulatory: ScoreByRegulatoryPanel[] = scoreConfigs.map(
    ({ key, label, color }) => ({
      score: label,
      color,
      boxes: scoresByRegR.rows.map((r) => ({
        category: r.reg as string,
        p5: numOrNull(r[`${key}_p5`]),
        q1: numOrNull(r[`${key}_q1`]),
        median: numOrNull(r[`${key}_med`]),
        q3: numOrNull(r[`${key}_q3`]),
        p95: numOrNull(r[`${key}_p95`]),
      })),
    }),
  );

  // Takeaways
  const takeaways = buildTakeaways(
    totalVariants,
    summary,
    clinvarTotalCount,
    numOrNull(cosmicMedianR.rows[0]?.median),
    (topCosmicR.rows[0]?.gene as string) || null,
  );

  // Priority variants
  const prioritizedVariants = priorityR.rows as unknown as PrioritizedVariant[];

  return {
    totalVariants,
    summary,
    regionType,
    consequence,
    afSpectrum,
    topGenes,
    geneHancerTargets,
    scores,
    afByFunction,
    scoresByRegulatory,
    clinvarSignificance,
    clinvarReviewStatus,
    topDiseases,
    totalWithClinvar: withClinvarCount,
    alphaMissense,
    topMissenseGenes,
    totalMissense: totalMissenseCount,
    takeaways,
    prioritizedVariants,
  };
}
