"use client";

import { API_BASE } from "@/config/api";
import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import {
  useServerTable,
  useClientSearchParams,
  updateClientUrl,
} from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type {
  EnhancerGeneRow,
  PaginatedResponse,
  RegionSummary,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useEnhancerGenesQuery } from "@features/enrichment/hooks/use-enhancer-genes-query";
import { formatDist, formatTissueName } from "@shared/utils/tissue-format";
import { tissueFilter } from "./filter-helpers";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ============================================================================
// Method config
// ============================================================================

const METHODS = [
  { id: "abc", label: "ABC" },
  { id: "epiraction", label: "EPIraction" },
  { id: "epimap", label: "EpiMap" },
  { id: "re2g", label: "RE2G" },
] as const;

const STRONG_THRESHOLD: Record<string, number> = {
  abc: 0.02,
  epiraction: 0.001,
  epimap: 0.5,
  re2g: 0.02,
};

const METHOD_COLORS: Record<string, string> = {
  abc: "#8b5cf6",
  epiraction: "#3b82f6",
  epimap: "#f59e0b",
  re2g: "#10b981",
};

const AXIS_LABELS: Record<string, string> = {
  abc: "ABC score (Activity \u00d7 Contact / \u03a3)",
  epiraction: "EPIraction score",
  epimap: "Link score (co-activity correlation)",
  re2g: "RE2G score",
};

// ============================================================================
// Formatting helpers
// ============================================================================

function normalizeScore(score: number, method: string): number {
  if (score <= 0) return 0;
  if (method === "epiraction") {
    // Log-scale: 1e-6 -> 0, 0.1 -> 1
    return Math.min(1, Math.max(0, (Math.log10(score) + 6) / 5));
  }
  // sqrt spreads ABC/RE2G's typical 0.001-0.1 range
  return Math.min(1, Math.sqrt(score));
}

function formatScoreValue(
  score: number | null | undefined,
  method: string,
): React.ReactNode {
  if (score == null) return "\u2014";
  if (method === "epiraction") {
    if (score === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(score)));
    const mantissa = score / Math.pow(10, exp);
    return (
      <span>
        {mantissa.toFixed(1)}&times;10
        <sup className="text-xs">{exp}</sup>
      </span>
    );
  }
  return score.toFixed(3);
}

// ============================================================================
// Reusable cell renderers
// ============================================================================

function ScoreCell({
  score,
  method,
}: {
  score: number | null;
  method: string;
}) {
  if (score == null)
    return <span className="text-muted-foreground/40">&mdash;</span>;
  const isStrong = score >= (STRONG_THRESHOLD[method] ?? 0);
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isStrong ? "bg-primary" : "bg-primary/40",
          )}
          style={{ width: `${normalizeScore(score, method) * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs tabular-nums",
          isStrong ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {formatScoreValue(score, method)}
      </span>
    </div>
  );
}

function BoolBadge({ value, label }: { value: unknown; label: string }) {
  if (value == null) return null;
  const yes = value === true || value === 1;
  return (
    <span
      className={cn(
        "inline-flex px-1.5 py-0.5 rounded text-xs font-medium",
        yes
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Column factory helpers
// ============================================================================

function detailText(
  key: string,
  header: string,
  description?: string,
): ColumnDef<EnhancerGeneRow, unknown> {
  return {
    id: `d_${key}`,
    header,
    enableSorting: false,
    meta: description ? ({ description } satisfies ColumnMeta) : undefined,
    cell: ({ row }) => {
      const v = row.original.detail?.[key];
      if (v == null)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs text-muted-foreground">{String(v)}</span>
      );
    },
  };
}

function detailNum(
  key: string,
  header: string,
  decimals = 2,
  description?: string,
): ColumnDef<EnhancerGeneRow, unknown> {
  return {
    id: `d_${key}`,
    header,
    enableSorting: false,
    meta: description ? ({ description } satisfies ColumnMeta) : undefined,
    cell: ({ row }) => {
      const v = row.original.detail?.[key] as number | null | undefined;
      if (v == null)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {v.toFixed(decimals)}
        </span>
      );
    },
  };
}

// ============================================================================
// Shared column definitions
// ============================================================================

const geneCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "gene_symbol",
  accessorKey: "gene_symbol",
  header: "Gene",
  enableSorting: false,
  meta: { description: "Target gene symbol" } satisfies ColumnMeta,
  cell: ({ row }) => {
    const gene = row.original.gene_symbol;
    if (gene)
      return (
        <span className="text-sm font-medium text-foreground">{gene}</span>
      );
    // EpiMap fallback: gene_id from detail
    const geneId = row.original.detail?.gene_id as string | undefined;
    if (geneId)
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {geneId}
        </span>
      );
    return <span className="text-muted-foreground/40">&mdash;</span>;
  },
};

const tissueCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "tissue_name",
  accessorKey: "tissue_name",
  header: "Tissue",
  enableSorting: false,
  meta: { description: "Biosample tissue" } satisfies ColumnMeta,
  cell: ({ getValue }) => (
    <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
      {formatTissueName(getValue() as string)}
    </span>
  ),
};

function makeScoreCol(
  header: string,
  description: string,
): ColumnDef<EnhancerGeneRow, unknown> {
  return {
    id: "score",
    accessorKey: "score",
    header,
    enableSorting: true,
    meta: { description } satisfies ColumnMeta,
    cell: ({ row }) => (
      <ScoreCell score={row.original.score} method={row.original.method} />
    ),
  };
}

const distCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "distance",
  accessorKey: "distance",
  header: "Distance",
  enableSorting: true,
  meta: { description: "Enhancer midpoint to gene TSS (bp)" } satisfies ColumnMeta,
  cell: ({ getValue }) => {
    const v = getValue() as number | null;
    if (v == null)
      return <span className="text-muted-foreground/40">&mdash;</span>;
    return (
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatDist(v)}
      </span>
    );
  },
};

const regionCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "position",
  accessorFn: (row) => row.start,
  header: "Enhancer",
  enableSorting: true,
  meta: { description: "Enhancer region coordinates" } satisfies ColumnMeta,
  cell: ({ row }) => (
    <span className="text-xs font-mono tabular-nums text-muted-foreground">
      {row.original.start.toLocaleString()}&ndash;
      {row.original.end.toLocaleString()}
    </span>
  ),
};

// ============================================================================
// Per-method column sets
// ============================================================================

function getColumns(method: string): ColumnDef<EnhancerGeneRow, unknown>[] {
  switch (method) {
    case "abc":
      return [
        regionCol,
        geneCol,
        tissueCol,
        detailText("tissue_group", "Group", "Tissue group (11 groups)"),
        makeScoreCol("ABC Score", "Activity \u00d7 Contact / \u03a3. >0.015 = functional link (Fulco 2019)"),
        detailNum("log10_score", "log\u2081\u2080(ABC)", 3, "Log\u2081\u2080 of ABC score"),
        distCol,
      ];

    case "epiraction":
      return [
        regionCol,
        geneCol,
        tissueCol,
        detailText("element_class", "Class"),
        makeScoreCol("EPIraction", "H3K27ac \u00d7 open chromatin \u00d7 Hi-C contact"),
        detailNum("h3k27ac", "H3K27ac", 2, "Raw ChIP-seq signal at enhancer"),
        detailNum("open_chromatin", "Open Chrom.", 2, "Accessibility signal"),
        detailNum("hic_contacts", "Hi-C", 2, "3D contact frequency"),
        detailNum("hic_fold_change", "Hi-C FC"),
        detailNum("activity", "Activity"),
        distCol,
      ];

    case "epimap":
      return [
        regionCol,
        geneCol,
        detailText("gene_id", "Ensembl ID"),
        tissueCol,
        makeScoreCol("Link Score", "Enhancer-gene co-activity correlation"),
        detailText("enhancer_id", "Module ID"),
      ];

    case "re2g":
      return [
        regionCol,
        geneCol,
        tissueCol,
        detailText("sub_method", "Sub-method"),
        detailText("element_class", "Class"),
        makeScoreCol("ABC Score", "Activity \u00d7 Contact model score"),
        detailNum("activity_base", "Activity", 2, "DNase/ATAC signal at enhancer"),
        {
          id: "d_flags",
          header: "Flags",
          enableSorting: false,
          cell: ({ row }) => {
            const d = row.original.detail;
            if (!d) return null;
            return (
              <div className="flex items-center gap-1">
                <BoolBadge value={d.is_self_promoter} label="self-P" />
                <BoolBadge value={d.gene_is_expressed} label="expr" />
              </div>
            );
          },
        },
        detailNum("hic_contact", "Hi-C Obs.", 4, "Measured 3D contact frequency"),
        distCol,
      ];

    default:
      return [regionCol, geneCol, tissueCol, makeScoreCol("Score", "Prediction score"), distCol];
  }
}

// ============================================================================
// Method tab bar
// ============================================================================

function MethodTabBar({
  activeMethod,
  onMethodChange,
}: {
  activeMethod: string;
  onMethodChange: (method: string) => void;
}) {
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
      {METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onMethodChange(m.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            m.id === activeMethod
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Tissue Summary — server-aggregated via group_by=tissue_name
// ============================================================================

interface TissueAggRaw {
  group_key: string;
  max_value: number;
  count: number;
  top_item: string | null;
}

interface TissueAggRow {
  tissue: string;
  max_value: number;
  count: number;
  top_item: string | null;
}

async function fetchTissueAgg(
  loc: string,
  method: string,
  tissueGroup?: string,
): Promise<TissueAggRow[]> {
  if (tissueGroup) {
    // Inside a tissue group: fetch individual rows, aggregate by tissue_name
    const params = new URLSearchParams({
      method,
      tissue_group: tissueGroup,
      sort_by: "score",
      sort_dir: "desc",
      limit: "100",
    });
    const res = await fetch(
      `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?${params}`,
      { credentials: "include" },
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json: { data: EnhancerGeneRow[] } = await res.json();
    const map = new Map<string, TissueAggRow>();
    for (const r of json.data) {
      const name = r.tissue_name;
      const existing = map.get(name);
      if (!existing) {
        map.set(name, { tissue: name, max_value: r.score ?? 0, count: 1, top_item: r.gene_symbol });
      } else {
        existing.count++;
        if ((r.score ?? 0) > existing.max_value) {
          existing.max_value = r.score ?? 0;
          existing.top_item = r.gene_symbol;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.max_value - a.max_value);
  }

  // Default: group by tissue_group across all groups
  const params = new URLSearchParams({ method, group_by: "tissue_group" });
  const res = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?${params}`,
      { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: { data: TissueAggRaw[] } = await res.json();
  return json.data.map((r) => ({
    tissue: r.group_key,
    max_value: r.max_value,
    count: r.count,
    top_item: r.top_item,
  }));
}

function dotRadius(count: number): number {
  if (count >= 15) return 8;
  if (count >= 5) return 6;
  return 4;
}

function TissueSummaryChart({
  loc,
  activeMethod,
  tissueGroup,
}: {
  loc: string;
  activeMethod: string;
  tissueGroup?: string;
}) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["enhancer-tissue-agg", loc, activeMethod, tissueGroup],
    queryFn: () => fetchTissueAgg(loc, activeMethod, tissueGroup),
    staleTime: 5 * 60 * 1000,
  });

  const methodLabel =
    METHODS.find((m) => m.id === activeMethod)?.label ?? activeMethod;
  const dotColor = METHOD_COLORS[activeMethod] ?? "#8b5cf6";
  const threshold = STRONG_THRESHOLD[activeMethod] ?? 0;
  const axisLabel = AXIS_LABELS[activeMethod] ?? "Score";

  // Already sorted by max_value desc from API — take top 20
  const top = rows?.slice(0, 20) ?? [];
  const maxScore = top.length > 0 ? top[0].max_value : 0;
  const xMax = maxScore * 1.1;

  // Generate ~5 nice tick values for the X axis (must be before any early return)
  const ticks = useMemo(() => {
    if (xMax <= 0) return [0];
    const step = xMax / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
    const niceStep =
      step / magnitude >= 5
        ? 5 * magnitude
        : step / magnitude >= 2
          ? 2 * magnitude
          : magnitude;
    const result: number[] = [];
    for (let v = 0; v <= xMax; v += niceStep) {
      result.push(v);
    }
    return result;
  }, [xMax]);

  const toPercent = (score: number) =>
    xMax > 0 ? (score / xMax) * 100 : 0;
  const thresholdPct = toPercent(threshold);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <div className="text-sm font-medium text-foreground">Top Tissues</div>
          <div className="text-xs text-muted-foreground">Loading...</div>
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 h-3 bg-muted rounded animate-pulse" />
              <div className="flex-1 h-3 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!top.length) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Top {tissueGroup ? "Tissues" : "Tissue Groups"} by {methodLabel} Score
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Best {methodLabel} score per {tissueGroup ? "tissue" : "tissue group"}{tissueGroup ? ` within ${tissueGroup}` : ""}
          </p>
        </div>

        <div className="px-4 py-3">
          {/* Dot plot rows */}
          {top.map((row, idx) => {
            const r = dotRadius(row.count);
            const pct = toPercent(row.max_value);

            return (
              <Tooltip key={`${row.tissue}-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center group cursor-default"
                    style={{ height: 24 }}
                  >
                    {/* Tissue label */}
                    <span
                      className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate shrink-0 text-right pr-2"
                      style={{ width: 130 }}
                    >
                      {tissueGroup ? formatTissueName(row.tissue) : row.tissue}
                    </span>

                    {/* Dot plot area */}
                    <div className="flex-1 relative" style={{ height: 24 }}>
                      {/* Horizontal leader line */}
                      <div
                        className="absolute top-1/2 left-0 border-t border-border"
                        style={{ width: `${pct}%`, transform: "translateY(-50%)" }}
                      />
                      {/* Dot */}
                      <div
                        className="absolute top-1/2 rounded-full transition-transform group-hover:scale-125"
                        style={{
                          left: `${pct}%`,
                          width: r * 2,
                          height: r * 2,
                          backgroundColor: dotColor,
                          transform: `translate(-50%, -50%)`,
                        }}
                      />
                    </div>

                    {/* Gene name */}
                    <span className="text-xs font-mono text-muted-foreground w-20 truncate shrink-0 pl-1.5">
                      {row.top_item ?? "\u2014"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {row.count.toLocaleString()} prediction{row.count !== 1 ? "s" : ""}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* X axis with threshold line */}
          <div className="flex items-start" style={{ paddingTop: 4 }}>
            <div style={{ width: 130 }} className="shrink-0" />
            <div className="flex-1 relative" style={{ height: 28 }}>
              {/* Threshold dashed line (spans full height of chart above) */}
              {thresholdPct > 0 && thresholdPct < 100 && (
                <div
                  className="absolute border-l border-dashed border-muted-foreground/50"
                  style={{
                    left: `${thresholdPct}%`,
                    bottom: 14,
                    height: top.length * 24 + 4,
                  }}
                />
              )}
              {/* Axis line */}
              <div className="absolute top-0 left-0 right-0 border-t border-border" />
              {/* Tick marks and labels */}
              {ticks.map((v) => {
                const pct = toPercent(v);
                return (
                  <div
                    key={v}
                    className="absolute"
                    style={{ left: `${pct}%`, top: 0 }}
                  >
                    <div className="border-l border-border" style={{ height: 4 }} />
                    <span
                      className="text-xs tabular-nums text-muted-foreground absolute"
                      style={{ transform: "translateX(-50%)", top: 6, whiteSpace: "nowrap" }}
                    >
                      {v < 0.001
                        ? v.toExponential(0)
                        : v < 1
                          ? v.toPrecision(2)
                          : v.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-20 shrink-0" />
          </div>

          {/* Axis label */}
          <div className="flex items-center" style={{ paddingTop: 2 }}>
            <div style={{ width: 130 }} className="shrink-0" />
            <div className="flex-1 text-center text-xs text-muted-foreground">
              {axisLabel}
            </div>
            <div className="w-20 shrink-0" />
          </div>

          {/* Dot size legend */}
          <div className="flex items-center justify-center gap-4 pt-3">
            {[
              { label: "1\u20134", r: 4 },
              { label: "5\u201314", r: 6 },
              { label: "15+", r: 8 },
            ].map(({ label, r }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="rounded-full"
                  style={{
                    width: r * 2,
                    height: r * 2,
                    backgroundColor: dotColor,
                    opacity: 0.6,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {label} predictions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Filter config (target_gene + tissue only; method is handled by tabs)
// ============================================================================

function buildFilters(
  genes: string[],
  tissues: string[],
): ServerFilterConfig[] {
  return [
    {
      id: "target_gene",
      label: "Target Gene",
      type: "select",
      placeholder: "All genes",
      options: genes.map((g) => ({ value: g, label: g })),
    },
    tissueFilter(tissues, { label: "Tissue", format: false }),
  ];
}

// ============================================================================
// Main component
// ============================================================================

const ENHANCER_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best Score",
  metricDescription: "Strongest enhancer-gene prediction score (ABC/EPIraction/EpiMap/RE2G) in this tissue group",
  countLabel: "Predictions",
  formatMetric: (v) => (v < 0.01 ? v.toExponential(1) : v.toFixed(3)),
};

interface EnhancerGenesViewProps {
  loc: string;
  totalCount: number;
  genes: string[];
  tissues: string[];
  initialData?: PaginatedResponse<EnhancerGeneRow>;
  summary?: RegionSummary | null;
  basePath?: string;
  groupedData?: TissueGroupRow[];
}

export function EnhancerGenesView({
  loc,
  totalCount,
  genes,
  tissues,
  initialData,
  summary,
  basePath,
  groupedData,
}: EnhancerGenesViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={ENHANCER_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total predictions`}
      />
    );
  }

  return (
    <EnhancerGenesDetailView
      loc={loc}
      totalCount={totalCount}
      genes={genes}
      tissues={tissues}
      initialData={initialData}
      summary={summary}
      basePath={basePath}
    />
  );
}

function EnhancerGenesDetailView({
  loc,
  totalCount,
  genes,
  tissues,
  initialData,
  summary,
  basePath,
}: Omit<EnhancerGenesViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();
  const activeMethod = searchParams.get("method") || "abc";

  const filters = useMemo(
    () => buildFilters(genes, tissues),
    [genes, tissues],
  );

  const columns = useMemo(
    () => getColumns(activeMethod),
    [activeMethod],
  );

  const { data, pageInfo, isLoading, isFetching, prefetchNext } =
    useEnhancerGenesQuery({ loc, initialData });

  const hasActiveFilters = Boolean(
    searchParams.get("target_gene") || searchParams.get("tissue") || searchParams.get("tissue_group"),
  );

  const liveTotal =
    pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters,
    serverPagination: true,
    paginationInfo,
  });

  useEffect(() => {
    if (pageInfo.hasMore && !isFetching) {
      prefetchNext();
    }
  }, [pageInfo.hasMore, isFetching, prefetchNext]);

  const handleMethodChange = useCallback((method: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("method", method);
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, false);
  }, []);

  const methodInfo = METHODS.find((m) => m.id === activeMethod) ?? METHODS[0];
  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} ${methodInfo.label} predictions across ${tissues.length} tissues`
      : `${methodInfo.label} predictions across ${tissues.length} tissues`;

  return (
    <div className="space-y-4">
      <TissueGroupBackButton />

      <MethodTabBar
        activeMethod={activeMethod}
        onMethodChange={handleMethodChange}
      />

      <TissueSummaryChart
        loc={loc}
        activeMethod={activeMethod}
        tissueGroup={searchParams.get("tissue_group") || undefined}
      />

      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search genes, tissues..."
        searchColumn="gene_symbol"
        exportable
        exportFilename={`enhancer-genes-${activeMethod}-${loc}`}
        filterable
        filters={filters}
        filterValues={tableState.filterValues}
        onFilterChange={tableState.onFilterChange}
        filterChips={tableState.filterChips}
        onRemoveFilterChip={tableState.onRemoveFilterChip}
        onClearFilters={tableState.onClearFilters}
        loading={isLoading && data.length === 0}
        transitioning={isFetching && data.length > 0}
        serverPagination={tableState.pagination}
        serverSort={tableState.serverSort}
        pageSizeOptions={[25, 50, 100]}
        emptyMessage={`No ${methodInfo.label} enhancer-gene predictions found`}
      />
    </div>
  );
}
