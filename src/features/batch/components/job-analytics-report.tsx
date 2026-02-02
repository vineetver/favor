"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  AlertCircle,
  BarChart3,
  Database,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StatCard } from "./stat-card";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDuckDB, type QueryResult } from "../hooks/use-duckdb";

// ============================================================================
// Types
// ============================================================================

interface JobAnalyticsReportProps {
  parquetUrl: string;
  jobId: string;
  filename?: string;
  className?: string;
}

interface ReportData {
  totalVariants: number | null;
  chromosomeDistribution: { chromosome: string; count: number; percentage: number }[];
  consequenceTypes: { consequence: string; count: number; percentage: number }[];
  clinvarSignificance: { significance: string; count: number }[];
  alleleFrequencyBins: { bin: string; count: number; percentage: number }[];
  caddDistribution: { bin: string; count: number; avgScore: number | null }[];
  topGenes: { gene: string; count: number }[];
  summaryStats: {
    pathogenicCount: number;
    rareVariantCount: number;
    rareVariantPercent: number;
    highImpactCount: number;
    codingVariantCount: number;
    nonCodingVariantCount: number;
  };
}

// ============================================================================
// Colors
// ============================================================================

const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
];

const CLINVAR_COLORS: Record<string, string> = {
  Pathogenic: "#dc2626",
  "Likely pathogenic": "#ef4444",
  "Pathogenic/Likely pathogenic": "#f87171",
  "Uncertain significance": "#f59e0b",
  "Likely benign": "#22c55e",
  Benign: "#16a34a",
  "Benign/Likely benign": "#4ade80",
  "Conflicting interpretations": "#8b5cf6",
  "not provided": "#94a3b8",
};

const AF_COLORS: Record<string, string> = {
  "Not observed": "#1e293b",
  "Ultra-rare (<0.01%)": "#7c3aed",
  "Very rare (0.01-0.1%)": "#8b5cf6",
  "Rare (0.1-1%)": "#a78bfa",
  "Low frequency (1-5%)": "#60a5fa",
  "Common (>5%)": "#22c55e",
  Unknown: "#94a3b8",
};

// ============================================================================
// Queries
// ============================================================================

const QUERIES = {
  totalVariants: "SELECT COUNT(*) as total FROM variants",

  chromosomeDistribution: `
    SELECT
      chromosome,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM variants
    GROUP BY chromosome
    ORDER BY
      CASE
        WHEN chromosome = 'X' THEN 23
        WHEN chromosome = 'Y' THEN 24
        WHEN chromosome = 'MT' THEN 25
        ELSE TRY_CAST(chromosome AS INTEGER)
      END
  `,

  consequenceTypes: `
    SELECT
      COALESCE(genecode_consequence, 'Unknown') as consequence,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM variants
    GROUP BY consequence
    ORDER BY count DESC
    LIMIT 15
  `,

  clinvarSignificance: `
    SELECT
      COALESCE(clinvar_clnsig, 'Not in ClinVar') as significance,
      COUNT(*) as count
    FROM variants
    GROUP BY significance
    ORDER BY count DESC
  `,

  alleleFrequencyBins: `
    SELECT
      CASE
        WHEN gnomad_genome_af IS NULL THEN 'Unknown'
        WHEN gnomad_genome_af = 0 THEN 'Not observed'
        WHEN gnomad_genome_af < 0.0001 THEN 'Ultra-rare (<0.01%)'
        WHEN gnomad_genome_af < 0.001 THEN 'Very rare (0.01-0.1%)'
        WHEN gnomad_genome_af < 0.01 THEN 'Rare (0.1-1%)'
        WHEN gnomad_genome_af < 0.05 THEN 'Low frequency (1-5%)'
        ELSE 'Common (>5%)'
      END as bin,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM variants
    GROUP BY bin
    ORDER BY
      CASE bin
        WHEN 'Not observed' THEN 1
        WHEN 'Ultra-rare (<0.01%)' THEN 2
        WHEN 'Very rare (0.01-0.1%)' THEN 3
        WHEN 'Rare (0.1-1%)' THEN 4
        WHEN 'Low frequency (1-5%)' THEN 5
        WHEN 'Common (>5%)' THEN 6
        ELSE 7
      END
  `,

  caddDistribution: `
    SELECT
      CASE
        WHEN main_cadd_phred IS NULL THEN 'Unknown'
        WHEN main_cadd_phred < 10 THEN 'Benign (<10)'
        WHEN main_cadd_phred < 20 THEN 'Moderate (10-20)'
        WHEN main_cadd_phred < 30 THEN 'Deleterious (20-30)'
        ELSE 'Highly deleterious (>30)'
      END as bin,
      COUNT(*) as count,
      ROUND(AVG(main_cadd_phred), 2) as avg_score
    FROM variants
    GROUP BY bin
    ORDER BY avg_score DESC NULLS LAST
  `,

  topGenes: `
    SELECT
      genecode_genes as gene,
      COUNT(*) as count
    FROM variants
    WHERE genecode_genes IS NOT NULL
    GROUP BY genecode_genes
    ORDER BY count DESC
    LIMIT 20
  `,

  pathogenicCount: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE clinvar_clnsig IS NOT NULL
      AND (
        clinvar_clnsig ILIKE '%pathogenic%'
      )
  `,

  rareVariants: `
    SELECT
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants), 2) as percentage
    FROM variants
    WHERE gnomad_genome_af IS NOT NULL AND gnomad_genome_af < 0.01
  `,

  highImpactCount: `
    SELECT COUNT(*) as count
    FROM variants
    WHERE
      main_protein_predictions_sift_cat = 'D'
      OR main_protein_predictions_polyphen_cat = 'D'
      OR (alphamissense_max_pathogenicity IS NOT NULL AND alphamissense_max_pathogenicity > 0.8)
  `,

  codingNonCoding: `
    SELECT
      CASE
        WHEN genecode_consequence IN (
          'missense_variant', 'synonymous_variant', 'stop_gained', 'stop_lost',
          'start_lost', 'frameshift_variant', 'inframe_insertion', 'inframe_deletion',
          'protein_altering_variant', 'coding_sequence_variant'
        ) THEN 'coding'
        ELSE 'non_coding'
      END as variant_type,
      COUNT(*) as count
    FROM variants
    GROUP BY variant_type
  `,
};

// ============================================================================
// Chart Section Component
// ============================================================================

function ChartSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-slate-200 py-0 gap-0">
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobAnalyticsReport({
  parquetUrl,
  jobId,
  filename,
  className,
}: JobAnalyticsReportProps) {
  const { isLoading: isInitializing, isReady, error: initError, loadParquet, query } = useDuckDB();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load parquet file when DuckDB is ready
  useEffect(() => {
    if (isReady && !dataLoaded && !isLoadingData) {
      setIsLoadingData(true);
      loadParquet(parquetUrl)
        .then(() => {
          setDataLoaded(true);
          setIsLoadingData(false);
        })
        .catch((err) => {
          setLoadError(err.message);
          setIsLoadingData(false);
        });
    }
  }, [isReady, dataLoaded, isLoadingData, loadParquet, parquetUrl]);

  // Generate report when data is loaded
  const generateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      // Run all queries in parallel
      const [
        totalResult,
        chromResult,
        consequenceResult,
        clinvarResult,
        afResult,
        caddResult,
        genesResult,
        pathogenicResult,
        rareResult,
        highImpactResult,
        codingResult,
      ] = await Promise.all([
        query(QUERIES.totalVariants),
        query(QUERIES.chromosomeDistribution),
        query(QUERIES.consequenceTypes),
        query(QUERIES.clinvarSignificance),
        query(QUERIES.alleleFrequencyBins),
        query(QUERIES.caddDistribution),
        query(QUERIES.topGenes),
        query(QUERIES.pathogenicCount),
        query(QUERIES.rareVariants),
        query(QUERIES.highImpactCount),
        query(QUERIES.codingNonCoding),
      ]);

      // Parse coding/non-coding
      const codingRow = codingResult.rows.find((r) => r.variant_type === "coding");
      const nonCodingRow = codingResult.rows.find((r) => r.variant_type === "non_coding");

      setReportData({
        totalVariants: totalResult.rows[0]?.total as number | null,
        chromosomeDistribution: chromResult.rows.map((r) => ({
          chromosome: String(r.chromosome),
          count: r.count as number,
          percentage: r.percentage as number,
        })),
        consequenceTypes: consequenceResult.rows.map((r) => ({
          consequence: String(r.consequence),
          count: r.count as number,
          percentage: r.percentage as number,
        })),
        clinvarSignificance: clinvarResult.rows.map((r) => ({
          significance: String(r.significance),
          count: r.count as number,
        })),
        alleleFrequencyBins: afResult.rows.map((r) => ({
          bin: String(r.bin),
          count: r.count as number,
          percentage: r.percentage as number,
        })),
        caddDistribution: caddResult.rows.map((r) => ({
          bin: String(r.bin),
          count: r.count as number,
          avgScore: r.avg_score as number | null,
        })),
        topGenes: genesResult.rows.map((r) => ({
          gene: String(r.gene),
          count: r.count as number,
        })),
        summaryStats: {
          pathogenicCount: (pathogenicResult.rows[0]?.count as number) || 0,
          rareVariantCount: (rareResult.rows[0]?.count as number) || 0,
          rareVariantPercent: (rareResult.rows[0]?.percentage as number) || 0,
          highImpactCount: (highImpactResult.rows[0]?.count as number) || 0,
          codingVariantCount: (codingRow?.count as number) || 0,
          nonCodingVariantCount: (nonCodingRow?.count as number) || 0,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report";
      setReportError(message);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [query]);

  // Auto-generate report when data is loaded
  useEffect(() => {
    if (dataLoaded && !reportData && !isGeneratingReport && !reportError) {
      generateReport();
    }
  }, [dataLoaded, reportData, isGeneratingReport, reportError, generateReport]);

  // Export report as PDF (simplified - just opens print dialog)
  const handleExport = useCallback(() => {
    window.print();
  }, []);

  // Loading state
  if (isInitializing || isLoadingData || isGeneratingReport) {
    return (
      <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-base font-medium text-slate-700">
            {isInitializing
              ? "Initializing analytics engine..."
              : isLoadingData
                ? "Loading variant data..."
                : "Generating report..."}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            This may take a moment for large datasets
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (initError || loadError || reportError) {
    return (
      <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <p className="text-base font-medium text-rose-700 mb-2">
            Failed to Generate Report
          </p>
          <p className="text-sm text-rose-600 max-w-md text-center">
            {initError || loadError || reportError}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) return null;

  return (
    <div className={cn("space-y-6 print:space-y-4", className)}>
      {/* Actions Bar */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={generateReport}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        <StatCard
          label="Total Variants"
          value={reportData.totalVariants || 0}
          icon={Database}
          variant="primary"
        />
        <StatCard
          label="Pathogenic"
          value={reportData.summaryStats.pathogenicCount}
          subValue="ClinVar P/LP variants"
          variant="negative"
        />
        <StatCard
          label="Rare Variants"
          value={reportData.summaryStats.rareVariantCount}
          subValue={`${reportData.summaryStats.rareVariantPercent}% of total (AF < 1%)`}
          variant="warning"
        />
        <StatCard
          label="High Impact"
          value={reportData.summaryStats.highImpactCount}
          subValue="SIFT/PolyPhen/AM predicted"
          variant="positive"
        />
      </div>

      {/* Coding vs Non-coding */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Coding Variants"
          value={reportData.summaryStats.codingVariantCount}
          subValue={`${((reportData.summaryStats.codingVariantCount / (reportData.totalVariants || 1)) * 100).toFixed(1)}% of total`}
        />
        <StatCard
          label="Non-coding Variants"
          value={reportData.summaryStats.nonCodingVariantCount}
          subValue={`${((reportData.summaryStats.nonCodingVariantCount / (reportData.totalVariants || 1)) * 100).toFixed(1)}% of total`}
        />
      </div>

      {/* Chromosome Distribution */}
      <ChartSection
        title="Chromosome Distribution"
        description="Number of variants per chromosome"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={reportData.chromosomeDistribution} margin={{ bottom: 20 }}>
              <XAxis
                dataKey="chromosome"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString(), "Variants"]}
                labelFormatter={(label) => `Chromosome ${label}`}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Allele Frequency Radar Chart */}
      <ChartSection
        title="Allele Frequency Distribution"
        description="gnomAD genome allele frequency categories"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadarChart data={reportData.alleleFrequencyBins.filter((d) => d.bin !== "Unknown")}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="bin"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) =>
                    value.length > 15 ? `${value.slice(0, 15)}...` : value
                  }
                />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Variants"
                  dataKey="percentage"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.5}
                />
                <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={reportData.alleleFrequencyBins}
                  dataKey="count"
                  nameKey="bin"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ payload }) =>
                    payload.percentage > 5 ? `${payload.percentage}%` : ""
                  }
                  labelLine={false}
                >
                  {reportData.alleleFrequencyBins.map((entry) => (
                    <Cell
                      key={entry.bin}
                      fill={AF_COLORS[entry.bin] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    Number(value).toLocaleString(),
                    name,
                  ]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartSection>

      {/* Consequence Types */}
      <ChartSection
        title="Variant Consequence Types"
        description="Most severe consequence from Gencode annotations"
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={reportData.consequenceTypes}
              layout="vertical"
              margin={{ left: 150 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="consequence"
                tick={{ fontSize: 11 }}
                width={140}
                tickFormatter={(value) =>
                  value.length > 25 ? `${value.slice(0, 25)}...` : value
                }
              />
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString(), "Variants"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {reportData.consequenceTypes.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* ClinVar Significance */}
      <ChartSection
        title="ClinVar Clinical Significance"
        description="Distribution of clinical significance classifications"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={reportData.clinvarSignificance}
                dataKey="count"
                nameKey="significance"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                label={({ payload }) =>
                  payload.count > (reportData.totalVariants || 0) * 0.05
                    ? String(payload.significance).split(" ")[0]
                    : ""
                }
                labelLine={false}
              >
                {reportData.clinvarSignificance.map((entry) => (
                  <Cell
                    key={entry.significance}
                    fill={CLINVAR_COLORS[entry.significance] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  Number(value).toLocaleString(),
                  name,
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* CADD Score Distribution */}
      <ChartSection
        title="CADD Phred Score Distribution"
        description="Combined Annotation Dependent Depletion scores"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={reportData.caddDistribution.filter((d) => d.bin !== "Unknown")}>
              <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString(), "Variants"]}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Top Genes */}
      <ChartSection
        title="Top 20 Genes by Variant Count"
        description="Genes with the most variants in this dataset"
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={reportData.topGenes}
              layout="vertical"
              margin={{ left: 80 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="gene"
                tick={{ fontSize: 11 }}
                width={70}
              />
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString(), "Variants"]}
              />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4 print:py-2">
        Generated by FAVOR Batch Annotation • {new Date().toISOString()}
      </div>
    </div>
  );
}
