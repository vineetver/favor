"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Table,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDuckDB, type QueryResult, type LoadDataResult } from "../hooks/use-duckdb";

// ============================================================================
// Types
// ============================================================================

interface JobAnalyticsProps {
  /** URL to the Arrow IPC file (or parquet for backwards compatibility) */
  dataUrl: string;
  jobId: string;
  filename?: string;
  className?: string;
}

interface PresetQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  category: "overview" | "distribution" | "clinical" | "population" | "functional";
}

// ============================================================================
// Preset Queries
// ============================================================================

const PRESET_QUERIES: PresetQuery[] = [
  // Overview
  {
    id: "total-variants",
    name: "Total Variants",
    description: "Count of all variants in the dataset",
    sql: "SELECT COUNT(*) as total_variants FROM variants WHERE lower(status) = 'found'",
    category: "overview",
  },
  {
    id: "chromosome-distribution",
    name: "Variants by Chromosome",
    description: "Distribution of variants across chromosomes",
    sql: `
      SELECT
        variant.chromosome,
        COUNT(*) as variant_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM variants
      WHERE lower(status) = 'found'
      GROUP BY variant.chromosome
      ORDER BY
        CASE
          WHEN variant.chromosome = 'X' THEN 23
          WHEN variant.chromosome = 'Y' THEN 24
          WHEN variant.chromosome = 'MT' THEN 25
          ELSE TRY_CAST(variant.chromosome AS INTEGER)
        END
    `,
    category: "distribution",
  },
  {
    id: "consequence-types",
    name: "Consequence Types",
    description: "Variant consequences from Gencode annotations",
    sql: `
      SELECT
        COALESCE(variant.genecode.consequence, 'Unknown') as consequence,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM variants
      WHERE lower(status) = 'found'
      GROUP BY consequence
      ORDER BY count DESC
      LIMIT 20
    `,
    category: "functional",
  },
  // Clinical
  {
    id: "clinvar-significance",
    name: "ClinVar Clinical Significance",
    description: "Distribution of clinical significance classifications",
    sql: `
      SELECT
        COALESCE(variant.clinvar.clnsig[1], 'Not in ClinVar') as significance,
        COUNT(*) as count
      FROM variants
      WHERE lower(status) = 'found'
      GROUP BY significance
      ORDER BY count DESC
    `,
    category: "clinical",
  },
  {
    id: "pathogenic-variants",
    name: "Pathogenic Variants",
    description: "Variants classified as pathogenic or likely pathogenic",
    sql: `
      SELECT
        variant.chromosome,
        variant.position,
        variant.variant_vcf,
        variant.clinvar.clnsig[1] as clnsig,
        variant.clinvar.clndn[1] as clndn
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.clinvar.clnsig IS NOT NULL
        AND len(list_filter(variant.clinvar.clnsig, x -> x IS NOT NULL AND (
          lower(CAST(x AS VARCHAR)) LIKE '%pathogenic%'
        ))) > 0
      LIMIT 100
    `,
    category: "clinical",
  },
  // Population
  {
    id: "allele-frequency-bins",
    name: "Allele Frequency Distribution",
    description: "Distribution of gnomAD allele frequencies",
    sql: `
      SELECT
        CASE
          WHEN variant.gnomad_genome.af IS NULL THEN 'Unknown'
          WHEN variant.gnomad_genome.af = 0 THEN 'Not observed'
          WHEN variant.gnomad_genome.af < 0.0001 THEN 'Ultra-rare (<0.01%)'
          WHEN variant.gnomad_genome.af < 0.001 THEN 'Very rare (0.01-0.1%)'
          WHEN variant.gnomad_genome.af < 0.01 THEN 'Rare (0.1-1%)'
          WHEN variant.gnomad_genome.af < 0.05 THEN 'Low frequency (1-5%)'
          ELSE 'Common (>5%)'
        END as frequency_bin,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM variants
      WHERE lower(status) = 'found'
      GROUP BY frequency_bin
      ORDER BY
        CASE frequency_bin
          WHEN 'Not observed' THEN 1
          WHEN 'Ultra-rare (<0.01%)' THEN 2
          WHEN 'Very rare (0.01-0.1%)' THEN 3
          WHEN 'Rare (0.1-1%)' THEN 4
          WHEN 'Low frequency (1-5%)' THEN 5
          WHEN 'Common (>5%)' THEN 6
          ELSE 7
        END
    `,
    category: "population",
  },
  {
    id: "rare-variants",
    name: "Rare Variants (AF < 1%)",
    description: "Count and percentage of rare variants",
    sql: `
      SELECT
        COUNT(*) as rare_variants,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM variants WHERE lower(status) = 'found'), 2) as percentage
      FROM variants
      WHERE lower(status) = 'found'
        AND variant.gnomad_genome.af IS NOT NULL
        AND variant.gnomad_genome.af < 0.01
    `,
    category: "population",
  },
  // Functional
  {
    id: "high-impact-variants",
    name: "High Impact Variants",
    description: "Variants with high functional impact predictions",
    sql: `
      SELECT
        variant.chromosome,
        variant.position,
        variant.variant_vcf,
        variant.genecode.consequence,
        variant.main.protein_predictions.sift_cat,
        variant.main.protein_predictions.polyphen_cat,
        variant.alphamissense.max_pathogenicity as am_score
      FROM variants
      WHERE lower(status) = 'found'
        AND (
          variant.main.protein_predictions.sift_cat = 'D'
          OR variant.main.protein_predictions.polyphen_cat = 'D'
          OR variant.alphamissense.max_pathogenicity > 0.8
        )
      LIMIT 100
    `,
    category: "functional",
  },
  {
    id: "cadd-distribution",
    name: "CADD Score Distribution",
    description: "Distribution of CADD phred scores",
    sql: `
      SELECT
        CASE
          WHEN variant.main.cadd.phred IS NULL THEN 'Unknown'
          WHEN variant.main.cadd.phred < 10 THEN 'Likely benign (<10)'
          WHEN variant.main.cadd.phred < 20 THEN 'Possibly deleterious (10-20)'
          WHEN variant.main.cadd.phred < 30 THEN 'Likely deleterious (20-30)'
          ELSE 'Highly deleterious (>30)'
        END as cadd_bin,
        COUNT(*) as count,
        ROUND(AVG(variant.main.cadd.phred), 2) as avg_score
      FROM variants
      WHERE lower(status) = 'found'
      GROUP BY cadd_bin
      ORDER BY avg_score DESC NULLS LAST
    `,
    category: "functional",
  },
  // Gene-level
  {
    id: "genes-with-variants",
    name: "Top Genes by Variant Count",
    description: "Genes with the most variants",
    sql: `
      SELECT
        unnest(variant.genecode.genes) as gene,
        COUNT(*) as variant_count
      FROM variants
      WHERE lower(status) = 'found' AND variant.genecode.genes IS NOT NULL
      GROUP BY gene
      ORDER BY variant_count DESC
      LIMIT 50
    `,
    category: "overview",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  overview: "Overview",
  distribution: "Distribution",
  clinical: "Clinical",
  population: "Population Genetics",
  functional: "Functional Impact",
};

// ============================================================================
// Result Table Component
// ============================================================================

function ResultTable({ result }: { result: QueryResult }) {
  if (result.rowCount === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No results found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {result.columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 hover:bg-slate-50/50"
            >
              {result.columns.map((col) => (
                <td key={col} className="px-4 py-2 whitespace-nowrap">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rowCount > 100 && (
        <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
          Showing first 100 of {result.rowCount.toLocaleString()} rows
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "bigint") return value.toLocaleString();
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(4);
  }
  if (typeof value === "object") {
    return JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val
    );
  }
  return String(value);
}

// ============================================================================
// Query Card Component
// ============================================================================

function QueryCard({
  query,
  onRun,
  result,
  isLoading,
  error,
}: {
  query: PresetQuery;
  onRun: () => void;
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-slate-900">{query.name}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{query.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRun}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* SQL Preview */}
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
            {query.sql.trim()}
          </pre>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-rose-50 border-t border-rose-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !error && (
        <div className="border-t border-slate-200">
          <ResultTable result={result} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Custom Query Component
// ============================================================================

function CustomQuery({
  onRun,
  result,
  isLoading,
  error,
}: {
  onRun: (sql: string) => void;
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [sql, setSql] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sql.trim()) {
      onRun(sql);
    }
  };

  return (
    <Card className="border border-slate-200 py-0 gap-0">
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          <CardTitle className="text-sm font-semibold">Custom SQL Query</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM variants LIMIT 10"
              className="w-full h-32 px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Table: <code className="bg-slate-100 px-1 py-0.5 rounded">variants</code>
              </p>
              <Button type="submit" disabled={isLoading || !sql.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute Query
              </Button>
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-rose-50 border-t border-rose-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !error && (
          <div className="border-t border-slate-200">
            <ResultTable result={result} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobAnalytics({
  dataUrl,
  jobId,
  filename,
  className,
}: JobAnalyticsProps) {
  const { isLoading: isInitializing, isReady, error: initError, loadArrow, query, clearCache } = useDuckDB();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<LoadDataResult | null>(null);

  // Query results state
  const [queryResults, setQueryResults] = useState<Record<string, QueryResult | null>>({});
  const [queryErrors, setQueryErrors] = useState<Record<string, string | null>>({});
  const [loadingQueries, setLoadingQueries] = useState<Record<string, boolean>>({});

  // Custom query state
  const [customResult, setCustomResult] = useState<QueryResult | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [isCustomLoading, setIsCustomLoading] = useState(false);

  // Load Arrow IPC file when DuckDB is ready
  useEffect(() => {
    if (isReady && !dataLoaded && !isLoadingData) {
      setIsLoadingData(true);
      loadArrow(dataUrl)
        .then((result) => {
          setCacheInfo(result);
          setDataLoaded(true);
          setIsLoadingData(false);
        })
        .catch((err) => {
          setLoadError(err.message);
          setIsLoadingData(false);
        });
    }
  }, [isReady, dataLoaded, isLoadingData, loadArrow, dataUrl]);

  // Handle cache clear and reload
  const handleClearCache = useCallback(async () => {
    await clearCache();
    setCacheInfo(null);
    setDataLoaded(false);
  }, [clearCache]);

  // Run a preset query
  const runPresetQuery = useCallback(
    async (queryDef: PresetQuery) => {
      setLoadingQueries((prev) => ({ ...prev, [queryDef.id]: true }));
      setQueryErrors((prev) => ({ ...prev, [queryDef.id]: null }));

      try {
        const result = await query(queryDef.sql);
        setQueryResults((prev) => ({ ...prev, [queryDef.id]: result }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Query failed";
        setQueryErrors((prev) => ({ ...prev, [queryDef.id]: message }));
      } finally {
        setLoadingQueries((prev) => ({ ...prev, [queryDef.id]: false }));
      }
    },
    [query],
  );

  // Run custom query
  const runCustomQuery = useCallback(
    async (sql: string) => {
      setIsCustomLoading(true);
      setCustomError(null);

      try {
        const result = await query(sql);
        setCustomResult(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Query failed";
        setCustomError(message);
      } finally {
        setIsCustomLoading(false);
      }
    },
    [query],
  );

  // Export results as CSV
  const exportToCsv = useCallback((result: QueryResult, queryName: string) => {
    const headers = result.columns.join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val);
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${queryName.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Group queries by category
  const queriesByCategory = PRESET_QUERIES.reduce(
    (acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push(q);
      return acc;
    },
    {} as Record<string, PresetQuery[]>,
  );

  // Loading state
  if (isInitializing || isLoadingData) {
    return (
      <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-base font-medium text-slate-700">
            {isInitializing ? "Initializing analytics engine..." : "Loading variant data..."}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            This may take a moment for large datasets
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (initError || loadError) {
    return (
      <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <p className="text-base font-medium text-rose-700 mb-2">Failed to Load Analytics</p>
          <p className="text-sm text-rose-600 max-w-md text-center">
            {initError || loadError}
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="border border-slate-200 py-0 gap-0">
        <CardHeader className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Cohort Analytics
                </CardTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {filename || `Job ${jobId.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cacheInfo && (
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border",
                    cacheInfo.fromCache
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}
                  title={cacheInfo.fromCache ? "Data loaded from browser cache" : "Data fetched from server"}
                >
                  <Database className="w-3 h-3 inline mr-1" />
                  {cacheInfo.fromCache ? "Cached" : "Fresh"} ({(cacheInfo.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
              {cacheInfo?.fromCache && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCache}
                  title="Clear cache and reload data"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">
            Use the preset queries below or write custom SQL to analyze your variant data.
            All queries run locally in your browser using DuckDB WASM.
          </p>
        </CardContent>
      </Card>

      {/* Preset Queries by Category */}
      {Object.entries(queriesByCategory).map(([category, queries]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-400" />
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="space-y-3">
            {queries.map((q) => (
              <QueryCard
                key={q.id}
                query={q}
                onRun={() => runPresetQuery(q)}
                result={queryResults[q.id] ?? null}
                isLoading={loadingQueries[q.id] ?? false}
                error={queryErrors[q.id] ?? null}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Custom Query */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          Custom Query
        </h3>
        <CustomQuery
          onRun={runCustomQuery}
          result={customResult}
          isLoading={isCustomLoading}
          error={customError}
        />
      </div>
    </div>
  );
}
