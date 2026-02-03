"use client";

import { cn } from "@infra/utils";
import { createColumns } from "@infra/table/column-builder";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { Variant } from "@features/variant/types";
import { apcColumns } from "@features/variant/config/hg38/columns/shared";
import { clinvarColumns } from "@features/variant/config/hg38/columns/clinvar";
import { spliceAiColumns } from "@features/variant/config/hg38/columns/splice-ai";
import { somaticMutationColumns } from "@features/variant/config/hg38/columns/somatic-mutation";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDuckDB } from "../hooks/use-duckdb";
import { StatCard, type StatCardVariant } from "./stat-card";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface JobAnalyticsReportProps {
  parquetUrl: string;
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
}

// ============================================================================
// SQL Queries
// ============================================================================

const SQL_QUERIES = {
  totalVariants: `SELECT COUNT(*) as count FROM variants`,

  clinvarPLP: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants) as percentage
    FROM variants
    WHERE len(list_filter(clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0
      AND list_has_any(
        list_transform(clinvar.clnsig, x -> lower(CAST(x AS VARCHAR))),
        ['pathogenic', 'likely_pathogenic', 'pathogenic/likely_pathogenic']
      )
  `,

  ultraRare: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants) as percentage
    FROM variants
    WHERE GREATEST(
      COALESCE(gnomad_exome.af, 0),
      COALESCE(gnomad_genome.af, 0),
      COALESCE(bravo.bravo_af, 0)
    ) < 0.001
  `,

  highImpact: `
    WITH scored AS (
      SELECT GREATEST(
        COALESCE(apc.conservation_v2, 0),
        COALESCE(apc.protein_function_v3, 0),
        COALESCE(main.cadd.phred, 0) / 2
      ) as integrative_max
      FROM variants
    ),
    threshold AS (
      SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY integrative_max) as p99
      FROM scored
    )
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants) as percentage
    FROM scored, threshold
    WHERE integrative_max >= threshold.p99
  `,

  cosmicHits: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE cosmic.sample_count IS NOT NULL AND cosmic.sample_count > 0
  `,

  spliceHigh: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE GREATEST(
      COALESCE(gnomad_exome.functional.spliceai_ds_max, 0),
      COALESCE(gnomad_genome.functional.spliceai_ds_max, 0),
      COALESCE(gnomad_genome.functional.pangolin_largest_ds, 0)
    ) >= 0.5
  `,

  regulatoryActive: `
    SELECT
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants) as percentage
    FROM variants
    WHERE
      COALESCE(apc.epigenetics_active, 0) >= 10
      OR COALESCE(epigenetic_phred.dnase, 0) >= 10
      OR COALESCE(epigenetic_phred.h3k27ac, 0) >= 10
      OR (ccre.annotations IS NOT NULL AND ccre.annotations != '')
  `,

  qcPassRate: `
    SELECT
      COUNT(CASE WHEN bravo.filter_status IS NOT NULL AND contains(CAST(bravo.filter_status AS VARCHAR), 'PASS') THEN 1 END) as pass_count,
      COUNT(CASE WHEN bravo.filter_status IS NOT NULL THEN 1 END) as total_annotated,
      COUNT(CASE WHEN bravo.filter_status IS NOT NULL AND contains(CAST(bravo.filter_status AS VARCHAR), 'PASS') THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN bravo.filter_status IS NOT NULL THEN 1 END), 0) as percentage
    FROM variants
  `,

  prioritizedVariants: `
    SELECT
      *,
      (
        CASE WHEN len(list_filter(clinvar.clnsig, x -> x IS NOT NULL AND lower(CAST(x AS VARCHAR)) LIKE '%pathogenic%' AND lower(CAST(x AS VARCHAR)) NOT LIKE '%benign%')) > 0 THEN 1000 ELSE 0 END +
        CASE WHEN cosmic.sample_count > 0 THEN 500 ELSE 0 END +
        COALESCE(GREATEST(apc.conservation_v2, apc.protein_function_v3), 0) * 10 +
        COALESCE(alphamissense.max_pathogenicity, 0) * 100
      ) as priority_score
    FROM variants
    ORDER BY priority_score DESC
    LIMIT 20
  `,

  clinvarTotal: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE len(list_filter(clinvar.clnsig, x -> x IS NOT NULL AND x != '')) > 0
  `,

  cosmicMedian: `
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cosmic.sample_count) as median
    FROM variants
    WHERE cosmic.sample_count IS NOT NULL AND cosmic.sample_count > 0
  `,

  topCosmicGene: `
    SELECT CAST(cosmic.gene AS VARCHAR) as gene, COUNT(*) as count
    FROM variants
    WHERE cosmic.gene IS NOT NULL
    GROUP BY cosmic.gene
    ORDER BY count DESC
    LIMIT 1
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

// Variant column (custom)
const variantColumn = col.accessor("variant_vcf", {
  accessor: (row) => row.variant_vcf,
  header: "Variant",
  cell: ({ getValue }) => {
    const v = getValue();
    if (!v) return "—";
    return (
      <span className="font-mono text-xs text-slate-700 truncate max-w-32 block" title={String(v)}>
        {String(v)}
      </span>
    );
  },
});

// Gene column (custom)
const geneColumn = col.accessor("gene", {
  accessor: (row) => row.genecode?.genes,
  header: "Gene",
  cell: ({ getValue }) => {
    const genes = getValue() as Array<string | null> | null | undefined;
    const filtered = genes?.filter(Boolean);
    return filtered?.length ? (
      <span className="font-medium text-slate-900">{filtered.join(", ")}</span>
    ) : (
      <span className="text-slate-300">—</span>
    );
  },
});

// Combine custom columns with existing column definitions
// Cast to PrioritizedVariant since it extends Variant
const prioritizedVariantColumns: ColumnDef<PrioritizedVariant>[] = [
  scoreColumn,
  variantColumn,
  geneColumn,
  // ClinVar from existing columns
  clinvarColumns[0] as ColumnDef<PrioritizedVariant>,
  // aPC scores from existing columns (with progress bars built-in)
  apcColumns.proteinFunction as ColumnDef<PrioritizedVariant>,
  apcColumns.conservation as ColumnDef<PrioritizedVariant>,
  // SpliceAI from existing columns
  spliceAiColumns[0] as ColumnDef<PrioritizedVariant>,
  // COSMIC from existing columns
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
        subtitle="Score = ClinVar P/LP (+1000) + COSMIC (+500) + aPC×10 + AlphaMissense×100"
        searchable={false}
        exportable={false}
        pageSizeOptions={[20]}
        defaultPageSize={20}
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
// Main Component
// ============================================================================

export function JobAnalyticsReport({
  parquetUrl,
  jobId: _jobId,
  filename: _filename,
  className,
}: JobAnalyticsReportProps) {
  const { query, loadParquet, isLoading: dbLoading, isReady, error: dbError } = useDuckDB();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parquetLoaded, setParquetLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load parquet file when DuckDB is ready
  useEffect(() => {
    if (!isReady || parquetLoaded) return;

    loadParquet(parquetUrl, "variants")
      .then(() => {
        setParquetLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load parquet file");
        setIsLoading(false);
      });
  }, [isReady, parquetUrl, loadParquet, parquetLoaded]);

  // Generate report data
  const generateReport = useCallback(async () => {
    if (!parquetLoaded) return;

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

      setReportData({
        totalVariants,
        clinvarTotal,
        cosmicMedianSampleCount,
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
      });
    } catch (err) {
      console.error("Report generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  }, [query, parquetLoaded]);

  // Generate report when parquet is loaded
  useEffect(() => {
    if (parquetLoaded) {
      generateReport();
    }
  }, [parquetLoaded, generateReport]);

  // Generate takeaways
  const takeaways = useMemo(() => {
    if (!reportData) return [];
    return generateTakeaways(reportData);
  }, [reportData]);


  // Loading state
  if (dbLoading || !parquetLoaded || isLoading) {
    return (
      <Card className="border border-slate-200 py-0 gap-0">
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700">
            {dbLoading
              ? "Initializing analytics engine..."
              : !parquetLoaded
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

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200 text-xs text-slate-400 print:mt-8">
        <p>
          Data sources: ClinVar, gnomAD v4, BRAVO, AlphaMissense, ENCODE cCRE, COSMIC. Build:
          GRCh38/hg38.
        </p>
        <p className="mt-1">
          Priority scoring: ClinVar P/LP (+1000) + COSMIC (+500) + aPC×10 + AlphaMissense×100
        </p>
      </footer>

    </div>
  );
}
