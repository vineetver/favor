"use client";

import { cn } from "@infra/utils";
import { createColumns } from "@infra/table/column-builder";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { Variant } from "@features/variant/types";
import { apcColumns } from "@features/variant/config/hg38/columns/shared";
import {
  clinvarColumns,
  clinicalSignificance,
  reviewStatus,
} from "@features/variant/config/hg38/columns/clinvar";
import { spliceAiColumns } from "@features/variant/config/hg38/columns/splice-ai";
import { somaticMutationColumns } from "@features/variant/config/hg38/columns/somatic-mutation";
import {
  proteinFunctionColumns,
  alphaMissense,
} from "@features/variant/config/hg38/columns/protein-function";
import { basicColumns } from "@features/variant/config/hg38/columns/basic";
import {
  functionalClassColumns,
  gencodeComprehensive,
  gencodeExonic,
} from "@features/variant/config/hg38/columns/functional-class";
import { DOT_COLORS } from "@infra/table/column-builder";
import { integrativeColumns } from "@features/variant/config/hg38/columns/integrative";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDuckDB } from "../hooks/use-duckdb";
import { StatCard, type StatCardVariant } from "./stat-card";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface JobAnalyticsReportProps {
  /** URL to the Arrow IPC file (or parquet for backwards compatibility) */
  dataUrl: string;
  jobId: string;
  filename?: string;
  className?: string;
}

interface MetricTile {
  label: string;
  value: number;
  percentage?: number;
  variant: StatCardVariant;
}

// PrioritizedVariant - full Variant with computed priority_score
type PrioritizedVariant = Variant & { priority_score: number };

interface RegionDistribution {
  region_type: string;
  count: number;
  percentage: number;
}

interface ConsequenceDistribution {
  consequence: string;
  count: number;
  percentage: number;
}

interface GeneByVariantCount {
  gene: string;
  variant_count: number;
}

interface GeneHancerTarget {
  gene: string;
  total_score: number;
  variant_count: number;
}

interface FunctionalClassData {
  regionDistribution: RegionDistribution[];
  consequenceDistribution: ConsequenceDistribution[];
  topGenes: GeneByVariantCount[];
  topGeneHancerTargets: GeneHancerTarget[];
}

/** Statistics for a single integrative score */
interface ScoreStats {
  name: string;
  label: string;
  coverage: number;
  coveragePct: number;
  p50: number | null;
  p90: number | null;
  topDecileCount: number;
}

interface IntegrativeScoreData {
  scoreStats: ScoreStats[];
  caddVsApcCorrelation: Array<{ cadd: number; apc: number }>;
}

/** ClinVar clinical significance distribution */
interface ClinSigDistribution {
  clnsig: string;
  count: number;
  percentage: number;
}

/** ClinVar review status distribution */
interface ReviewStatusDistribution {
  review_status: string;
  count: number;
  percentage: number;
}

/** Disease frequency */
interface DiseaseFrequency {
  disease: string;
  count: number;
}

interface ClinVarData {
  clinSigDistribution: ClinSigDistribution[];
  reviewStatusDistribution: ReviewStatusDistribution[];
  topDiseases: DiseaseFrequency[];
  totalWithClinvar: number;
}

/** AlphaMissense class distribution */
interface AlphaMissenseDistribution {
  am_class: string;
  count: number;
  percentage: number;
}

/** Top missense gene */
interface MissenseGene {
  gene: string;
  variant_count: number;
}

interface ProteinFunctionData {
  alphaMissenseDistribution: AlphaMissenseDistribution[];
  topMissenseGenes: MissenseGene[];
  totalMissense: number;
}

interface ReportData {
  totalVariants: number;
  metrics: {
    clinvarPLP: MetricTile;
    ultraRare: MetricTile;
    highImpact: MetricTile;
    cosmicHits: MetricTile;
    spliceHigh: MetricTile;
    regulatoryActive: MetricTile;
    qcPassRate: MetricTile;
  };
  // For takeaways
  clinvarTotal: number;
  cosmicMedianSampleCount: number | null;
  prioritizedVariants: PrioritizedVariant[];
  topCosmicGene: string | null;
  // Functional class data
  functionalClass: FunctionalClassData;
  // Integrative score data
  integrativeScore: IntegrativeScoreData;
  // ClinVar data
  clinvar: ClinVarData;
  // Protein Function data
  proteinFunction: ProteinFunctionData;
}

// ============================================================================
// SQL Queries
// ============================================================================

const SQL_QUERIES = {
  totalVariants: `SELECT COUNT(*) as count FROM variants WHERE lower(status) = 'found'`,

  clinvarPLP: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found') as percentage
    FROM variants
    WHERE lower(status) = 'found'
      AND len(list_filter(
        variant.clinvar.clnsig,
        x -> x IS NOT NULL
          AND lower(CAST(x AS VARCHAR)) LIKE '%pathogenic%'
          AND lower(CAST(x AS VARCHAR)) NOT LIKE '%benign%'
      )) > 0
  `,

  ultraRare: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found') as percentage
    FROM variants
    WHERE lower(status) = 'found'
      AND GREATEST(
        COALESCE(variant.gnomad_exome.af, 0),
        COALESCE(variant.gnomad_genome.af, 0),
        COALESCE(variant.bravo.bravo_af, 0)
      ) < 0.001
  `,

  highImpact: `
    WITH scored AS (
      SELECT GREATEST(
        COALESCE(variant.apc.conservation_v2, 0),
        COALESCE(variant.apc.protein_function_v3, 0),
        COALESCE(variant.main.cadd.phred, 0) / 2
      ) as integrative_max
      FROM variants
      WHERE lower(status) = 'found'
    ),
    threshold AS (
      SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY integrative_max) as p99
      FROM scored
    )
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found') as percentage
    FROM scored, threshold
    WHERE integrative_max >= threshold.p99
  `,

  cosmicHits: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE lower(status) = 'found'
      AND variant.cosmic.sample_count IS NOT NULL
      AND variant.cosmic.sample_count > 0
  `,

  spliceHigh: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE lower(status) = 'found'
      AND GREATEST(
        COALESCE(variant.gnomad_exome.functional.spliceai_ds_max, 0),
        COALESCE(variant.gnomad_genome.functional.spliceai_ds_max, 0),
        COALESCE(variant.gnomad_genome.functional.pangolin_largest_ds, 0)
      ) >= 0.5
  `,

  regulatoryActive: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found') as percentage
    FROM variants
    WHERE lower(status) = 'found'
      AND (
        COALESCE(variant.apc.epigenetics_active, 0) >= 10
        OR COALESCE(variant.main.encode.dnase.phred, 0) >= 10
        OR COALESCE(variant.main.encode.h3k27ac.phred, 0) >= 10
        OR (variant.ccre.annotations IS NOT NULL AND variant.ccre.annotations != '')
      )
  `,

  qcPassRate: `
    SELECT
      COUNT(CASE WHEN variant.bravo.filter_status IS NOT NULL AND contains(CAST(variant.bravo.filter_status AS VARCHAR), 'PASS') THEN 1 END) as pass_count,
      COUNT(CASE WHEN variant.bravo.filter_status IS NOT NULL THEN 1 END) as total_annotated,
      COUNT(CASE WHEN variant.bravo.filter_status IS NOT NULL AND contains(CAST(variant.bravo.filter_status AS VARCHAR), 'PASS') THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN variant.bravo.filter_status IS NOT NULL THEN 1 END), 0) as percentage
    FROM variants
    WHERE lower(status) = 'found'
  `,

  prioritizedVariants: `
    SELECT
      variant.*,
      (
        CASE WHEN len(list_filter(variant.clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0 THEN 1000 ELSE 0 END +
        CASE WHEN variant.cosmic.sample_count > 0 THEN 200 ELSE 0 END +
        COALESCE(variant.apc.protein_function_v3, 0) * 20 +
        COALESCE(variant.apc.conservation_v2, 0) * 10 +
        COALESCE(variant.alphamissense.max_pathogenicity, 0) * 100
      ) as priority_score
    FROM variants
    WHERE lower(status) = 'found'
    ORDER BY priority_score DESC
    LIMIT 20
  `,

  clinvarTotal: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE lower(status) = 'found'
      AND len(list_filter(variant.clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0
  `,

  cosmicMedian: `
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.cosmic.sample_count) as median
    FROM variants
    WHERE lower(status) = 'found'
      AND variant.cosmic.sample_count IS NOT NULL
      AND variant.cosmic.sample_count > 0
  `,

  topCosmicGene: `
    SELECT CAST(variant.cosmic.gene AS VARCHAR) as gene, COUNT(*) as count
    FROM variants
    WHERE lower(status) = 'found' AND variant.cosmic.gene IS NOT NULL
    GROUP BY variant.cosmic.gene
    ORDER BY count DESC
    LIMIT 1
  `,

  // Functional Class queries
  regionDistribution: `
    SELECT
      COALESCE(variant.genecode.region_type, 'Unknown') as region_type,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found'), 2) as percentage
    FROM variants
    WHERE lower(status) = 'found'
    GROUP BY region_type
    ORDER BY count DESC
  `,

  consequenceDistribution: `
    SELECT
      COALESCE(variant.genecode.consequence, 'Unknown') as consequence,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found'), 2) as percentage
    FROM variants
    WHERE lower(status) = 'found'
      AND variant.genecode.consequence IS NOT NULL
      AND variant.genecode.consequence != ''
    GROUP BY consequence
    ORDER BY count DESC
    LIMIT 10
  `,

  topGenesByVariantCount: `
    WITH gene_list AS (
      SELECT variant.genecode.genes as genes
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.genecode.genes IS NOT NULL
        AND len(variant.genecode.genes) > 0
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
      SELECT variant.genehancer.targets as targets
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.genehancer IS NOT NULL
        AND variant.genehancer.targets IS NOT NULL
        AND len(variant.genehancer.targets) > 0
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

  // Integrative Score queries
  integrativeScoreStats: `
    WITH total AS (
      SELECT COUNT(*) as n FROM variants WHERE lower(status) = 'found'
    ),
    stats AS (
      SELECT
        -- CADD
        COUNT(CASE WHEN variant.main.cadd.phred IS NOT NULL THEN 1 END) as cadd_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.main.cadd.phred) as cadd_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.main.cadd.phred) as cadd_p90,
        COUNT(CASE WHEN variant.main.cadd.phred >= 20 THEN 1 END) as cadd_top_decile,
        -- LINSIGHT
        COUNT(CASE WHEN variant.linsight IS NOT NULL THEN 1 END) as linsight_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.linsight) as linsight_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.linsight) as linsight_p90,
        COUNT(CASE WHEN variant.linsight >= 0.5 THEN 1 END) as linsight_top_decile,
        -- FATHMM-XF
        COUNT(CASE WHEN variant.fathmm_xf IS NOT NULL THEN 1 END) as fathmm_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.fathmm_xf) as fathmm_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.fathmm_xf) as fathmm_p90,
        COUNT(CASE WHEN variant.fathmm_xf >= 0.5 THEN 1 END) as fathmm_top_decile,
        -- aPC Protein Function (check apc struct exists OR specific field)
        COUNT(CASE WHEN variant.apc IS NOT NULL THEN 1 END) as apc_pf_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.apc.protein_function_v3) as apc_pf_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.apc.protein_function_v3) as apc_pf_p90,
        COUNT(CASE WHEN variant.apc.protein_function_v3 >= 10 THEN 1 END) as apc_pf_top_decile,
        -- aPC Conservation
        COUNT(CASE WHEN variant.apc IS NOT NULL THEN 1 END) as apc_cons_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.apc.conservation_v2) as apc_cons_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.apc.conservation_v2) as apc_cons_p90,
        COUNT(CASE WHEN variant.apc.conservation_v2 >= 10 THEN 1 END) as apc_cons_top_decile,
        -- aPC Epigenetics Active
        COUNT(CASE WHEN variant.apc IS NOT NULL THEN 1 END) as apc_epi_coverage,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY variant.apc.epigenetics_active) as apc_epi_p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY variant.apc.epigenetics_active) as apc_epi_p90,
        COUNT(CASE WHEN variant.apc.epigenetics_active >= 10 THEN 1 END) as apc_epi_top_decile
      FROM variants
      WHERE lower(status) = 'found'
    )
    SELECT stats.*, total.n as total_variants FROM stats, total
  `,

  caddVsApcSample: `
    SELECT
      variant.main.cadd.phred as cadd,
      variant.apc.protein_function_v3 as apc
    FROM variants
    WHERE lower(status) = 'found'
      AND variant.main.cadd.phred IS NOT NULL
      AND variant.apc.protein_function_v3 IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 200
  `,

  // ClinVar queries
  clinSigDistribution: `
    WITH clinvar_variants AS (
      SELECT variant.clinvar.clnsig[1] as clnsig
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.clinvar.clnsig IS NOT NULL
        AND len(variant.clinvar.clnsig) > 0
        AND variant.clinvar.clnsig[1] IS NOT NULL
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
      SELECT variant.clinvar.clnrevstat as review_status
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.clinvar.clnrevstat IS NOT NULL
        AND variant.clinvar.clnrevstat != ''
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
      SELECT variant.clinvar.clndn as diseases
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.clinvar.clndn IS NOT NULL
        AND len(variant.clinvar.clndn) > 0
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
    WHERE lower(status) = 'found'
      AND variant.clinvar.clnsig IS NOT NULL
      AND len(variant.clinvar.clnsig) > 0
  `,

  // Protein Function queries
  alphaMissenseDistribution: `
    WITH am_variants AS (
      SELECT
        CASE
          WHEN variant.alphamissense.max_pathogenicity > 0.564 THEN 'Likely Pathogenic'
          WHEN variant.alphamissense.max_pathogenicity >= 0.34 THEN 'Ambiguous'
          WHEN variant.alphamissense.max_pathogenicity IS NOT NULL THEN 'Likely Benign'
          ELSE NULL
        END as am_class
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.alphamissense.max_pathogenicity IS NOT NULL
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
      SELECT variant.genecode.genes as genes
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.genecode.consequence IS NOT NULL
        AND lower(variant.genecode.consequence) LIKE '%nonsynonymous%'
        AND variant.genecode.genes IS NOT NULL
        AND len(variant.genecode.genes) > 0
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
    WHERE lower(status) = 'found'
      AND variant.genecode.consequence IS NOT NULL
      AND lower(variant.genecode.consequence) LIKE '%nonsynonymous%'
  `,
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateTakeaways(data: ReportData): string[] {
  const takeaways: string[] = [];
  const total = data.totalVariants;

  // 1. ClinVar interpretation coverage
  const clinvarPct = total > 0 ? ((data.clinvarTotal / total) * 100).toFixed(1) : "0";
  takeaways.push(
    `${data.clinvarTotal.toLocaleString()} (${clinvarPct}%) variants have ClinVar interpretations; ${data.metrics.clinvarPLP.value.toLocaleString()} are Pathogenic/Likely Pathogenic.`
  );

  // 2. Ultra-rare
  const ultraRarePct = data.metrics.ultraRare.percentage ?? 0;
  takeaways.push(
    `${ultraRarePct.toFixed(1)}% of variants are ultra-rare (max AF < 1e-3) across gnomAD/BRAVO/1KG.`
  );

  // 3. Top integrative signals
  takeaways.push(
    `Top integrative signals: ${data.metrics.highImpact.value.toLocaleString()} variants fall in the top 1% by integrative percentile.`
  );

  // 4. Splicing risk
  if (data.metrics.spliceHigh.value > 0) {
    takeaways.push(
      `Splicing risk: ${data.metrics.spliceHigh.value.toLocaleString()} variants have SpliceAI/Pangolin >= 0.5.`
    );
  }

  // 5. Cancer evidence
  if (data.metrics.cosmicHits.value > 0) {
    const medianNote = data.cosmicMedianSampleCount !== null
      ? ` (median sample_count = ${data.cosmicMedianSampleCount.toLocaleString()})`
      : "";
    takeaways.push(
      `Cancer evidence: ${data.metrics.cosmicHits.value.toLocaleString()} variants appear in COSMIC${medianNote}.`
    );
  }

  return takeaways.slice(0, 5);
}

// ============================================================================
// Sub-Components
// ============================================================================


function ExecutiveTile({
  label,
  value,
  percentage,
  variant = "default",
}: {
  label: string;
  value: number;
  percentage?: number;
  variant?: StatCardVariant;
}) {
  const percentStr = percentage !== undefined ? `${percentage.toFixed(1)}%` : undefined;
  return (
    <StatCard
      value={value}
      label={label}
      percentage={percentStr}
      variant={variant}
    />
  );
}

// ============================================================================
// Prioritized Variants Table - Using DataSurface with existing column defs
// ============================================================================

/** Column definitions for prioritized variants - using existing column defs */
const col = createColumns<PrioritizedVariant>();

// Score column (custom, not in standard columns)
const scoreColumn = col.accessor("priority_score", {
  accessor: (row) => row.priority_score,
  header: "Score",
  cell: ({ getValue }) => {
    const v = getValue();
    if (v === null || v === undefined) return "—";
    return (
      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
        {Math.round(Number(v))}
      </span>
    );
  },
});

// Gene column (custom)
const geneColumn = col.accessor("gene", {
  accessor: (row) => row.genecode?.genes,
  header: "Gene",
  cell: ({ getValue }) => {
    const genes = getValue();
    const genesArray = Array.isArray(genes) ? genes.filter(Boolean) : [];
    return genesArray.length ? (
      <span className="font-medium text-slate-900">{genesArray.join(", ")}</span>
    ) : (
      <span className="text-slate-300">—</span>
    );
  },
});

// Combine custom columns with existing column definitions
// Cast to PrioritizedVariant since it extends Variant
const prioritizedVariantColumns: ColumnDef<PrioritizedVariant>[] = [
  scoreColumn,
  basicColumns[0] as ColumnDef<PrioritizedVariant>,
  // Basic info
  basicColumns[1] as ColumnDef<PrioritizedVariant>, // rsid
  geneColumn,
  // Gencode annotations
  functionalClassColumns[1] as ColumnDef<PrioritizedVariant>, // region_type
  functionalClassColumns[3] as ColumnDef<PrioritizedVariant>, // consequence
  // ClinVar
  clinvarColumns[0] as ColumnDef<PrioritizedVariant>, // clnsig
  clinvarColumns[2] as ColumnDef<PrioritizedVariant>, // clndn (disease name)
  clinvarColumns[4] as ColumnDef<PrioritizedVariant>, // clnrevstat (review status)
  // AlphaMissense
  proteinFunctionColumns[1] as ColumnDef<PrioritizedVariant>, // AlphaMissense class
  // Protein predictions
  proteinFunctionColumns[2] as ColumnDef<PrioritizedVariant>, // SIFT
  proteinFunctionColumns[3] as ColumnDef<PrioritizedVariant>, // PolyPhen
  // Allele frequencies
  basicColumns[4] as ColumnDef<PrioritizedVariant>, // bravo_af
  basicColumns[2] as ColumnDef<PrioritizedVariant>, // bravo filter_status
  basicColumns[7] as ColumnDef<PrioritizedVariant>, // gnomad_genome_af
  basicColumns[6] as ColumnDef<PrioritizedVariant>, // gnomad_exome_af
  basicColumns[5] as ColumnDef<PrioritizedVariant>, // tg_all
  // Regulatory
  functionalClassColumns[4] as ColumnDef<PrioritizedVariant>, // cage_promoter
  functionalClassColumns[5] as ColumnDef<PrioritizedVariant>, // cage_enhancer
  functionalClassColumns[6] as ColumnDef<PrioritizedVariant>, // genehancer
  // Integrative scores
  integrativeColumns[10] as ColumnDef<PrioritizedVariant>, // linsight
  integrativeColumns[11] as ColumnDef<PrioritizedVariant>, // fathmm_xf
  // aPC scores
  apcColumns.proteinFunction as ColumnDef<PrioritizedVariant>,
  apcColumns.conservation as ColumnDef<PrioritizedVariant>,
  apcColumns.epigeneticsActive as ColumnDef<PrioritizedVariant>,
  // SpliceAI
  spliceAiColumns[0] as ColumnDef<PrioritizedVariant>,
  // COSMIC
  somaticMutationColumns[0] as ColumnDef<PrioritizedVariant>,
  somaticMutationColumns[1] as ColumnDef<PrioritizedVariant>,
];

function PrioritizedVariantsTable({ variants }: { variants: PrioritizedVariant[] }) {
  if (variants.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        No prioritized variants found.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <DataSurface
        columns={prioritizedVariantColumns}
        data={variants}
        title={`Prioritized Variants (Top ${variants.length})`}
        subtitle="Score = ClinVar (+1000) + COSMIC (+200) + aPC protein×20 + aPC conservation×10 + AlphaMissense×100"
        searchable={false}
        exportable={false}
        pageSizeOptions={[5, 10, 20]}
        defaultPageSize={5}
      />
    </div>
  );
}

function KeyTakeaways({ takeaways }: { takeaways: string[] }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Key Takeaways</h3>
      <ul className="text-sm text-slate-600 space-y-1.5">
        {takeaways.map((takeaway, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-primary font-bold">•</span>
            <span>{takeaway}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Functional Class Section
// ============================================================================

function DistributionTable({
  data,
  title,
  categoryDefs,
  total,
}: {
  data: Array<{ label: string; value: number; percentage: number }>;
  title: string;
  categoryDefs: typeof gencodeComprehensive;
  total: number;
}) {
  // Create entries for all defined categories
  const allCategories = categoryDefs.items.map((cat) => {
    // Find matching data by checking if the category label matches any key
    const matchingEntry = data.find((d) => {
      const match = cat.match;
      if (match instanceof RegExp) {
        return match.test(d.label);
      }
      return d.label.toLowerCase() === String(match).toLowerCase();
    });

    return {
      label: cat.label,
      value: matchingEntry?.value ?? 0,
      percentage: total > 0 ? ((matchingEntry?.value ?? 0) / total) * 100 : 0,
      color: cat.color,
      description: cat.description,
    };
  });

  // Sort by value descending, but keep 0s at the end
  const sorted = [...allCategories].sort((a, b) => {
    if (a.value === 0 && b.value === 0) return 0;
    if (a.value === 0) return 1;
    if (b.value === 0) return -1;
    return b.value - a.value;
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">{title}</h4>
      <div className="space-y-1.5">
        {sorted.map((item) => {
          const colorClass = DOT_COLORS[item.color] || "bg-slate-400";
          return (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass)} />
                <span
                  className="text-sm text-slate-700 truncate"
                  title={item.description}
                >
                  {item.label}
                </span>
              </div>
              <div className="text-sm tabular-nums shrink-0 ml-2">
                <span className={cn("font-medium", item.value > 0 ? "text-slate-900" : "text-slate-300")}>
                  {item.value.toLocaleString()}
                </span>
                {item.value > 0 && (
                  <span className="text-slate-400 ml-1.5">({item.percentage.toFixed(1)}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopGenesTable({ genes }: { genes: GeneByVariantCount[] }) {
  if (genes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No gene data available
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Top Genes by Variant Count</h4>
      <div className="space-y-1.5">
        {genes.slice(0, 8).map((gene, idx) => (
          <div key={gene.gene} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-slate-400 w-4 shrink-0">{idx + 1}.</span>
              <span
                className="text-sm font-mono text-slate-700 truncate max-w-[140px]"
                title={gene.gene}
              >
                {gene.gene}
              </span>
            </div>
            <span className="text-sm font-medium tabular-nums text-slate-900 shrink-0 ml-2">
              {gene.variant_count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneHancerTargetsTable({ targets }: { targets: GeneHancerTarget[] }) {
  if (targets.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No GeneHancer targets found
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Top GeneHancer Targets</h4>
      <div className="space-y-1.5">
        {targets.slice(0, 8).map((target, idx) => (
          <div key={target.gene} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-slate-400 w-4 shrink-0">{idx + 1}.</span>
              <span
                className="text-sm font-mono text-slate-700 truncate max-w-[140px]"
                title={target.gene}
              >
                {target.gene}
              </span>
            </div>
            <div className="text-sm tabular-nums shrink-0 ml-2">
              <span className="font-medium text-slate-900">{target.variant_count}</span>
              <span className="text-slate-400 ml-1.5">
                ({typeof target.total_score === "number" ? target.total_score.toFixed(1) : target.total_score})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunctionalClassSection({ data }: { data: FunctionalClassData }) {
  const regionData = data.regionDistribution.map((r) => ({
    label: r.region_type,
    value: r.count,
    percentage: r.percentage,
  }));

  const consequenceData = data.consequenceDistribution.map((c) => ({
    label: c.consequence,
    value: c.count,
    percentage: c.percentage,
  }));

  // Calculate totals for proper percentages
  const totalRegion = data.regionDistribution.reduce((sum, r) => sum + r.count, 0);
  const totalConsequence = data.consequenceDistribution.reduce((sum, c) => sum + c.count, 0);

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Functional Class</h2>

      {/* 2x2 grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <DistributionTable
              data={regionData}
              title="Region Type (GENCODE)"
              categoryDefs={gencodeComprehensive}
              total={totalRegion}
            />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <DistributionTable
              data={consequenceData}
              title="Exonic Consequence"
              categoryDefs={gencodeExonic}
              total={totalConsequence}
            />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <TopGenesTable genes={data.topGenes} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <GeneHancerTargetsTable targets={data.topGeneHancerTargets} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ============================================================================
// Integrative Score Section
// ============================================================================

function ScoreStatsTable({ stats }: { stats: ScoreStats[] }) {
  const formatNum = (n: number | null, decimals = 1) => {
    if (n === null) return "—";
    return n < 1 ? n.toFixed(3) : n.toFixed(decimals);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-3 py-2 text-left font-medium text-slate-600">Score</th>
            <th className="px-3 py-2 text-right font-medium text-slate-600">Coverage</th>
            <th className="px-3 py-2 text-right font-medium text-slate-600">P50</th>
            <th className="px-3 py-2 text-right font-medium text-slate-600">P90</th>
            <th className="px-3 py-2 text-right font-medium text-slate-600">High Impact</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.name} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 font-medium text-slate-900">{stat.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                {stat.coveragePct.toFixed(0)}%
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-mono text-slate-700">
                {formatNum(stat.p50)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-mono text-slate-700">
                {formatNum(stat.p90)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-600">
                {stat.topDecileCount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrativeScoreSection({ data }: { data: IntegrativeScoreData }) {
  // Calculate high-impact summary
  const totalHighImpact = data.scoreStats.reduce((sum, s) => sum + s.topDecileCount, 0);
  const avgCoverage = data.scoreStats.reduce((sum, s) => sum + s.coveragePct, 0) / data.scoreStats.length;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Integrative Score</h2>

      {/* Summary stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-slate-500">Avg Coverage: </span>
          <span className="font-medium text-slate-900">{avgCoverage.toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-slate-500">Total High-Impact: </span>
          <span className="font-medium text-amber-600">{totalHighImpact.toLocaleString()}</span>
        </div>
        <div className="text-xs text-slate-400">
          High = CADD≥20, LINSIGHT≥0.5, FATHMM≥0.5, aPC≥10
        </div>
      </div>

      {/* Score statistics table */}
      <Card className="border border-slate-200 py-0 gap-0">
        <CardContent className="p-4">
          <ScoreStatsTable stats={data.scoreStats} />
        </CardContent>
      </Card>
    </section>
  );
}

// ============================================================================
// ClinVar Section
// ============================================================================

function ClinSigTable({
  data,
  total,
}: {
  data: Array<{ label: string; value: number; percentage: number }>;
  total: number;
}) {
  // Build a map from the query results
  const dataMap = new Map(data.map((d) => [d.label.toLowerCase(), d]));

  // Create entries for all defined categories
  const allCategories = clinicalSignificance.items.map((cat) => {
    // Find matching data by checking if the category label matches any key
    const matchingEntry = data.find((d) => {
      const match = cat.match;
      if (match instanceof RegExp) {
        return match.test(d.label);
      }
      return d.label.toLowerCase() === String(match).toLowerCase();
    });

    return {
      label: cat.label,
      value: matchingEntry?.value ?? 0,
      percentage: total > 0 ? ((matchingEntry?.value ?? 0) / total) * 100 : 0,
      color: cat.color,
      description: cat.description,
    };
  });

  // Sort by value descending, but keep 0s at the end
  const sorted = [...allCategories].sort((a, b) => {
    if (a.value === 0 && b.value === 0) return 0;
    if (a.value === 0) return 1;
    if (b.value === 0) return -1;
    return b.value - a.value;
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Clinical Significance</h4>
      <div className="space-y-1.5">
        {sorted.map((item) => {
          const colorClass = DOT_COLORS[item.color] || "bg-slate-400";
          return (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass)} />
                <span
                  className="text-sm text-slate-700 truncate"
                  title={item.description}
                >
                  {item.label}
                </span>
              </div>
              <div className="text-sm tabular-nums shrink-0 ml-2">
                <span className={cn("font-medium", item.value > 0 ? "text-slate-900" : "text-slate-300")}>
                  {item.value.toLocaleString()}
                </span>
                {item.value > 0 && (
                  <span className="text-slate-400 ml-1.5">({item.percentage.toFixed(1)}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStatusTable({
  data,
  total,
}: {
  data: Array<{ label: string; value: number; percentage: number }>;
  total: number;
}) {
  // Create entries for all defined categories
  const allCategories = reviewStatus.items.map((cat) => {
    // Find matching data by checking if the category label matches any key
    const matchingEntry = data.find((d) => {
      const match = cat.match;
      if (match instanceof RegExp) {
        return match.test(d.label);
      }
      return d.label.toLowerCase() === String(match).toLowerCase();
    });

    return {
      label: cat.label,
      value: matchingEntry?.value ?? 0,
      percentage: total > 0 ? ((matchingEntry?.value ?? 0) / total) * 100 : 0,
      color: cat.color,
      description: cat.description,
    };
  });

  // Sort by value descending, but keep 0s at the end
  const sorted = [...allCategories].sort((a, b) => {
    if (a.value === 0 && b.value === 0) return 0;
    if (a.value === 0) return 1;
    if (b.value === 0) return -1;
    return b.value - a.value;
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Review Status</h4>
      <div className="space-y-1.5">
        {sorted.map((item) => {
          const colorClass = DOT_COLORS[item.color] || "bg-slate-400";
          return (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass)} />
                <span
                  className="text-sm text-slate-700 truncate"
                  title={item.description}
                >
                  {item.label}
                </span>
              </div>
              <div className="text-sm tabular-nums shrink-0 ml-2">
                <span className={cn("font-medium", item.value > 0 ? "text-slate-900" : "text-slate-300")}>
                  {item.value.toLocaleString()}
                </span>
                {item.value > 0 && (
                  <span className="text-slate-400 ml-1.5">({item.percentage.toFixed(1)}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDiseaseName(name: string): string {
  // Replace underscores with spaces
  let formatted = name.replace(/_/g, " ");
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  return formatted;
}

function TopDiseasesTable({ diseases }: { diseases: DiseaseFrequency[] }) {
  if (diseases.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No disease data available
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Top Associated Diseases</h4>
      <div className="space-y-1.5">
        {diseases.slice(0, 10).map((disease, idx) => (
          <div key={disease.disease} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-slate-400 w-4 shrink-0">{idx + 1}.</span>
              <span
                className="text-sm text-slate-700 truncate"
                title={disease.disease}
              >
                {formatDiseaseName(disease.disease)}
              </span>
            </div>
            <span className="text-sm font-medium tabular-nums text-slate-900 shrink-0 ml-2">
              {disease.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClinVarSection({ data }: { data: ClinVarData }) {
  const clinSigData = data.clinSigDistribution.map((c) => ({
    label: c.clnsig,
    value: c.count,
    percentage: c.percentage,
  }));

  const reviewData = data.reviewStatusDistribution.map((r) => ({
    label: r.review_status,
    value: r.count,
    percentage: r.percentage,
  }));

  // Count pathogenic variants
  const pathogenicCount = data.clinSigDistribution
    .filter((c) => /pathogenic/i.test(c.clnsig) && !/benign/i.test(c.clnsig))
    .reduce((sum, c) => sum + c.count, 0);

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">ClinVar</h2>

      {/* Summary stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-slate-500">Total with ClinVar: </span>
          <span className="font-medium text-slate-900">{data.totalWithClinvar.toLocaleString()}</span>
        </div>
        {pathogenicCount > 0 && (
          <div>
            <span className="text-slate-500">Pathogenic/Likely Path: </span>
            <span className="font-medium text-rose-600">{pathogenicCount.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* 2x2 grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <ClinSigTable data={clinSigData} total={data.totalWithClinvar} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <ReviewStatusTable data={reviewData} total={data.totalWithClinvar} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0 md:col-span-2">
          <CardContent className="p-4">
            <TopDiseasesTable diseases={data.topDiseases} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ============================================================================
// Protein Function Section
// ============================================================================

function AlphaMissenseTable({
  data,
  total,
}: {
  data: Array<{ label: string; value: number; percentage: number }>;
  total: number;
}) {
  // Create entries for all defined categories in the defined order
  const allCategories = alphaMissense.items.map((cat) => {
    const matchingEntry = data.find((d) => d.label === cat.label);

    return {
      label: cat.label,
      value: matchingEntry?.value ?? 0,
      percentage: total > 0 ? ((matchingEntry?.value ?? 0) / total) * 100 : 0,
      color: cat.color,
      description: cat.description,
    };
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">AlphaMissense Classification</h4>
      <div className="space-y-1.5">
        {allCategories.map((item) => {
          const colorClass = DOT_COLORS[item.color] || "bg-slate-400";
          return (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass)} />
                <span
                  className="text-sm text-slate-700 truncate"
                  title={item.description}
                >
                  {item.label}
                </span>
              </div>
              <div className="text-sm tabular-nums shrink-0 ml-2">
                <span className={cn("font-medium", item.value > 0 ? "text-slate-900" : "text-slate-300")}>
                  {item.value.toLocaleString()}
                </span>
                {item.value > 0 && (
                  <span className="text-slate-400 ml-1.5">({item.percentage.toFixed(1)}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopMissenseGenesTable({ genes }: { genes: MissenseGene[] }) {
  if (genes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No missense gene data available
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">Top Genes by Missense Variants</h4>
      <div className="space-y-1.5">
        {genes.slice(0, 8).map((gene, idx) => (
          <div key={gene.gene} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-slate-400 w-4 shrink-0">{idx + 1}.</span>
              <span
                className="text-sm font-mono text-slate-700 truncate max-w-[180px]"
                title={gene.gene}
              >
                {gene.gene}
              </span>
            </div>
            <span className="text-sm font-medium tabular-nums text-slate-900 shrink-0 ml-2">
              {gene.variant_count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProteinFunctionSection({ data }: { data: ProteinFunctionData }) {
  const amData = data.alphaMissenseDistribution.map((a) => ({
    label: a.am_class,
    value: a.count,
    percentage: a.percentage,
  }));

  // Total with AlphaMissense scores
  const totalWithAM = data.alphaMissenseDistribution.reduce((sum, a) => sum + a.count, 0);

  // Count likely pathogenic
  const pathogenicCount = data.alphaMissenseDistribution
    .filter((a) => /pathogenic/i.test(a.am_class))
    .reduce((sum, a) => sum + a.count, 0);

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Protein Function</h2>

      {/* Summary stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-slate-500">Total Missense: </span>
          <span className="font-medium text-slate-900">{data.totalMissense.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-500">With AlphaMissense: </span>
          <span className="font-medium text-slate-900">{totalWithAM.toLocaleString()}</span>
        </div>
        {pathogenicCount > 0 && (
          <div>
            <span className="text-slate-500">Likely Pathogenic: </span>
            <span className="font-medium text-rose-600">{pathogenicCount.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <AlphaMissenseTable data={amData} total={totalWithAM} />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 py-0 gap-0">
          <CardContent className="p-4">
            <TopMissenseGenesTable genes={data.topMissenseGenes} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobAnalyticsReport({
  dataUrl,
  jobId: _jobId,
  filename: _filename,
  className,
}: JobAnalyticsReportProps) {
  const { query, loadArrow, isLoading: dbLoading, isReady, error: dbError } = useDuckDB();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Arrow IPC file when DuckDB is ready
  useEffect(() => {
    if (!isReady || dataLoaded) return;

    loadArrow(dataUrl, "variants")
      .then(() => {
        setDataLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load Arrow file");
        setIsLoading(false);
      });
  }, [isReady, dataUrl, loadArrow, dataLoaded]);

  // Generate report data
  const generateReport = useCallback(async () => {
    if (!dataLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      // Run all queries in parallel
      const [
        totalResult,
        clinvarPLPResult,
        clinvarTotalResult,
        ultraRareResult,
        highImpactResult,
        cosmicHitsResult,
        cosmicMedianResult,
        spliceHighResult,
        regulatoryActiveResult,
        qcPassRateResult,
        prioritizedResult,
        topCosmicGeneResult,
        // Functional class queries
        regionDistributionResult,
        consequenceDistributionResult,
        topGenesResult,
        topGeneHancerTargetsResult,
        // Integrative score queries
        integrativeStatsResult,
        caddVsApcResult,
        // ClinVar queries
        clinSigDistributionResult,
        reviewStatusDistributionResult,
        topDiseasesResult,
        totalWithClinvarResult,
        // Protein Function queries
        alphaMissenseDistributionResult,
        topMissenseGenesResult,
        totalMissenseResult,
      ] = await Promise.all([
        query(SQL_QUERIES.totalVariants),
        query(SQL_QUERIES.clinvarPLP),
        query(SQL_QUERIES.clinvarTotal),
        query(SQL_QUERIES.ultraRare),
        query(SQL_QUERIES.highImpact),
        query(SQL_QUERIES.cosmicHits),
        query(SQL_QUERIES.cosmicMedian),
        query(SQL_QUERIES.spliceHigh),
        query(SQL_QUERIES.regulatoryActive),
        query(SQL_QUERIES.qcPassRate),
        query(SQL_QUERIES.prioritizedVariants),
        query(SQL_QUERIES.topCosmicGene),
        // Functional class queries
        query(SQL_QUERIES.regionDistribution),
        query(SQL_QUERIES.consequenceDistribution),
        query(SQL_QUERIES.topGenesByVariantCount),
        query(SQL_QUERIES.topGeneHancerTargets),
        // Integrative score queries
        query(SQL_QUERIES.integrativeScoreStats),
        query(SQL_QUERIES.caddVsApcSample),
        // ClinVar queries
        query(SQL_QUERIES.clinSigDistribution),
        query(SQL_QUERIES.reviewStatusDistribution),
        query(SQL_QUERIES.topDiseases),
        query(SQL_QUERIES.totalWithClinvar),
        // Protein Function queries
        query(SQL_QUERIES.alphaMissenseDistribution),
        query(SQL_QUERIES.topMissenseGenes),
        query(SQL_QUERIES.totalMissense),
      ]);

      // Parse results
      const totalVariants = (totalResult.rows[0]?.count as number) || 0;

      const clinvarPLP = clinvarPLPResult.rows[0] || { count: 0, percentage: 0 };
      const clinvarTotal = (clinvarTotalResult.rows[0]?.count as number) || 0;
      const ultraRare = ultraRareResult.rows[0] || { count: 0, percentage: 0 };
      const highImpact = highImpactResult.rows[0] || { count: 0, percentage: 0 };
      const cosmicHits = cosmicHitsResult.rows[0] || { count: 0 };
      const cosmicMedianSampleCount = (cosmicMedianResult.rows[0]?.median as number) || null;
      const spliceHigh = spliceHighResult.rows[0] || { count: 0 };
      const regulatoryActive = regulatoryActiveResult.rows[0] || { count: 0, percentage: 0 };
      const qcPassRate = qcPassRateResult.rows[0] || { pass_count: 0, percentage: null };

      // Prioritized variants - flat structure from scored CTE
      const prioritizedVariants = prioritizedResult.rows as unknown as PrioritizedVariant[];

      // Top COSMIC gene
      const topCosmicGene = (topCosmicGeneResult.rows[0]?.gene as string) || null;

      // Functional class data
      const functionalClass: FunctionalClassData = {
        regionDistribution: regionDistributionResult.rows as unknown as RegionDistribution[],
        consequenceDistribution: consequenceDistributionResult.rows as unknown as ConsequenceDistribution[],
        topGenes: topGenesResult.rows as unknown as GeneByVariantCount[],
        topGeneHancerTargets: topGeneHancerTargetsResult.rows as unknown as GeneHancerTarget[],
      };

      // Integrative score data
      const statsRow = integrativeStatsResult.rows[0] || {};
      const totalN = (statsRow.total_variants as number) || totalVariants || 1;

      const integrativeScore: IntegrativeScoreData = {
        scoreStats: [
          {
            name: "cadd",
            label: "CADD",
            coverage: (statsRow.cadd_coverage as number) || 0,
            coveragePct: ((statsRow.cadd_coverage as number) || 0) / totalN * 100,
            p50: statsRow.cadd_p50 as number | null,
            p90: statsRow.cadd_p90 as number | null,
            topDecileCount: (statsRow.cadd_top_decile as number) || 0,
          },
          {
            name: "linsight",
            label: "LINSIGHT",
            coverage: (statsRow.linsight_coverage as number) || 0,
            coveragePct: ((statsRow.linsight_coverage as number) || 0) / totalN * 100,
            p50: statsRow.linsight_p50 as number | null,
            p90: statsRow.linsight_p90 as number | null,
            topDecileCount: (statsRow.linsight_top_decile as number) || 0,
          },
          {
            name: "fathmm",
            label: "FATHMM-XF",
            coverage: (statsRow.fathmm_coverage as number) || 0,
            coveragePct: ((statsRow.fathmm_coverage as number) || 0) / totalN * 100,
            p50: statsRow.fathmm_p50 as number | null,
            p90: statsRow.fathmm_p90 as number | null,
            topDecileCount: (statsRow.fathmm_top_decile as number) || 0,
          },
          {
            name: "apc_pf",
            label: "aPC Protein Function",
            coverage: (statsRow.apc_pf_coverage as number) || 0,
            coveragePct: ((statsRow.apc_pf_coverage as number) || 0) / totalN * 100,
            p50: statsRow.apc_pf_p50 as number | null,
            p90: statsRow.apc_pf_p90 as number | null,
            topDecileCount: (statsRow.apc_pf_top_decile as number) || 0,
          },
          {
            name: "apc_cons",
            label: "aPC Conservation",
            coverage: (statsRow.apc_cons_coverage as number) || 0,
            coveragePct: ((statsRow.apc_cons_coverage as number) || 0) / totalN * 100,
            p50: statsRow.apc_cons_p50 as number | null,
            p90: statsRow.apc_cons_p90 as number | null,
            topDecileCount: (statsRow.apc_cons_top_decile as number) || 0,
          },
          {
            name: "apc_epi",
            label: "aPC Epigenetics Active",
            coverage: (statsRow.apc_epi_coverage as number) || 0,
            coveragePct: ((statsRow.apc_epi_coverage as number) || 0) / totalN * 100,
            p50: statsRow.apc_epi_p50 as number | null,
            p90: statsRow.apc_epi_p90 as number | null,
            topDecileCount: (statsRow.apc_epi_top_decile as number) || 0,
          },
        ],
        caddVsApcCorrelation: caddVsApcResult.rows as unknown as Array<{ cadd: number; apc: number }>,
      };

      // ClinVar data
      const clinvarData: ClinVarData = {
        clinSigDistribution: clinSigDistributionResult.rows as unknown as ClinSigDistribution[],
        reviewStatusDistribution: reviewStatusDistributionResult.rows as unknown as ReviewStatusDistribution[],
        topDiseases: topDiseasesResult.rows as unknown as DiseaseFrequency[],
        totalWithClinvar: (totalWithClinvarResult.rows[0]?.count as number) || 0,
      };

      // Protein Function data
      const proteinFunctionData: ProteinFunctionData = {
        alphaMissenseDistribution: alphaMissenseDistributionResult.rows as unknown as AlphaMissenseDistribution[],
        topMissenseGenes: topMissenseGenesResult.rows as unknown as MissenseGene[],
        totalMissense: (totalMissenseResult.rows[0]?.count as number) || 0,
      };

      setReportData({
        totalVariants,
        clinvarTotal,
        cosmicMedianSampleCount,
        functionalClass,
        integrativeScore,
        metrics: {
          clinvarPLP: {
            label: "ClinVar P/LP",
            value: (clinvarPLP.count as number) || 0,
            percentage: (clinvarPLP.percentage as number) || 0,
            variant: (clinvarPLP.count as number) > 0 ? "negative" : "default",
          },
          ultraRare: {
            label: "Ultra-rare",
            value: (ultraRare.count as number) || 0,
            percentage: (ultraRare.percentage as number) || 0,
            variant: "default",
          },
          highImpact: {
            label: "High-impact",
            value: (highImpact.count as number) || 0,
            percentage: (highImpact.percentage as number) || 0,
            variant: "default",
          },
          cosmicHits: {
            label: "COSMIC hits",
            value: (cosmicHits.count as number) || 0,
            variant: (cosmicHits.count as number) > 0 ? "warning" : "default",
          },
          spliceHigh: {
            label: "Splice-high",
            value: (spliceHigh.count as number) || 0,
            variant: (spliceHigh.count as number) > 0 ? "warning" : "default",
          },
          regulatoryActive: {
            label: "Regulatory active",
            value: (regulatoryActive.count as number) || 0,
            percentage: (regulatoryActive.percentage as number) || 0,
            variant: "default",
          },
          qcPassRate: {
            label: "QC PASS rate",
            value: (qcPassRate.pass_count as number) || 0,
            percentage: (qcPassRate.percentage as number) || undefined,
            variant:
              qcPassRate.percentage !== null && (qcPassRate.percentage as number) >= 95
                ? "positive"
                : qcPassRate.percentage !== null
                  ? "warning"
                  : "default",
          },
        },
        prioritizedVariants,
        topCosmicGene,
        clinvar: clinvarData,
        proteinFunction: proteinFunctionData,
      });
    } catch (err) {
      console.error("Report generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  }, [query, dataLoaded]);

  // Generate report when parquet is loaded
  useEffect(() => {
    if (dataLoaded) {
      generateReport();
    }
  }, [dataLoaded, generateReport]);

  // Generate takeaways
  const takeaways = useMemo(() => {
    if (!reportData) return [];
    return generateTakeaways(reportData);
  }, [reportData]);


  // Loading state
  if (dbLoading || !dataLoaded || isLoading) {
    return (
      <Card className="border border-slate-200 py-0 gap-0">
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700">
            {dbLoading
              ? "Initializing analytics engine..."
              : !dataLoaded
                ? "Loading data..."
                : "Generating report..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || dbError) {
    return (
      <Card className="border border-slate-200 py-0 gap-0">
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-2">Report generation failed</p>
          <p className="text-sm text-slate-500 max-w-md mb-4">{error || dbError}</p>
          <Button variant="outline" onClick={generateReport}>
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) return null;

  return (
    <div className={cn("max-w-5xl mx-auto print:max-w-none", className)}>
      {/* Executive Summary Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Executive Summary</h2>

        {/* Key Takeaways */}
        <KeyTakeaways takeaways={takeaways} />

        {/* Metric Tiles - 4x2 Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <ExecutiveTile
            label={reportData.metrics.clinvarPLP.label}
            value={reportData.metrics.clinvarPLP.value}
            percentage={reportData.metrics.clinvarPLP.percentage}
            variant={reportData.metrics.clinvarPLP.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.ultraRare.label}
            value={reportData.metrics.ultraRare.value}
            percentage={reportData.metrics.ultraRare.percentage}
            variant={reportData.metrics.ultraRare.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.highImpact.label}
            value={reportData.metrics.highImpact.value}
            percentage={reportData.metrics.highImpact.percentage}
            variant={reportData.metrics.highImpact.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.cosmicHits.label}
            value={reportData.metrics.cosmicHits.value}
            variant={reportData.metrics.cosmicHits.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.spliceHigh.label}
            value={reportData.metrics.spliceHigh.value}
            variant={reportData.metrics.spliceHigh.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.regulatoryActive.label}
            value={reportData.metrics.regulatoryActive.value}
            percentage={reportData.metrics.regulatoryActive.percentage}
            variant={reportData.metrics.regulatoryActive.variant}
          />
          <ExecutiveTile
            label={reportData.metrics.qcPassRate.label}
            value={reportData.metrics.qcPassRate.value}
            percentage={reportData.metrics.qcPassRate.percentage}
            variant={reportData.metrics.qcPassRate.variant}
          />
        </div>

        {/* Prioritized Variants Table */}
        <PrioritizedVariantsTable variants={reportData.prioritizedVariants} />
      </section>

      {/* Functional Class Section */}
      <FunctionalClassSection data={reportData.functionalClass} />

      {/* Integrative Score Section */}
      <IntegrativeScoreSection data={reportData.integrativeScore} />

      {/* ClinVar Section */}
      <ClinVarSection data={reportData.clinvar} />

      {/* Protein Function Section */}
      <ProteinFunctionSection data={reportData.proteinFunction} />

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200 text-xs text-slate-400 print:mt-8">
        <p>
          Data sources: ClinVar, gnomAD v4, BRAVO, AlphaMissense, ENCODE cCRE, COSMIC. Build:
          GRCh38/hg38.
        </p>
        <p className="mt-1">
          Priority scoring: ClinVar (+1000) + COSMIC (+200) + aPC protein×20 + aPC conservation×10 + AlphaMissense×100
        </p>
      </footer>

    </div>
  );
}
