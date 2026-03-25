"use client";

import { API_BASE } from "@/config/api";
import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import { Dash } from "@shared/components/ui/dash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { VariantCell } from "@shared/components/ui/variant-cell";
import { formatTissueName, TISSUE_GROUPS } from "@shared/utils/tissue-format";
import { CATEGORICAL_PALETTE } from "@shared/components/charts";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams, updateClientUrl } from "@shared/hooks";
import { tissueGroupFilter, significantOnlyFilter } from "./filter-helpers";
import type { ColumnMeta, DimensionConfig } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { QtlRow, PaginatedResponse, TissueGroupRow } from "@features/enrichment/api/region";
import { useQtlsQuery } from "@features/enrichment/hooks/use-qtls-query";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ---------------------------------------------------------------------------
// Source config
// ---------------------------------------------------------------------------

const QTL_SOURCES = [
  { id: "gtex", label: "GTEx eQTL" },
  { id: "gtex_susie", label: "GTEx Fine-mapped" },
  { id: "sqtl", label: "sQTL" },
  { id: "apaqtl", label: "APA QTL" },
  { id: "eqtl_catalogue", label: "eQTL Catalogue" },
  { id: "sc_eqtl", label: "Single-cell" },
  { id: "eqtl_ccre", label: "eQTL-cCRE" },
] as const;

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<QtlRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => <VariantCell vcf={row.original.variant_vcf} position={row.original.position} />,
  },
  {
    id: "gene_symbol",
    accessorKey: "gene_symbol",
    header: "Gene",
    enableSorting: false,
    meta: { description: "Target gene whose expression is affected by this QTL" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const gene = getValue() as string | null;
      if (!gene) return <Dash />;
      return <span className="text-sm font-medium text-foreground">{gene}</span>;
    },
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    meta: { description: "Tissue where this QTL association was detected" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "tss_distance",
    accessorKey: "tss_distance",
    header: "TSS Dist.",
    enableSorting: false,
    meta: { description: "Distance from variant to the transcription start site of the target gene" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      const abs = Math.abs(v);
      const label = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)} Mb` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)} kb` : `${abs} bp`;
      return <span className="text-xs tabular-nums text-muted-foreground">{label}</span>;
    },
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "\u2212log\u2081\u2080(p)",
    enableSorting: true,
    meta: { description: "Statistical significance. Higher = stronger evidence. >5 is genome-wide significant." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min((v / 50) * 100, 100)}%`, opacity: Math.max(0.4, Math.min(v / 50, 1)) }} />
          </div>
          <span className="text-xs tabular-nums text-foreground">{v.toFixed(1)}</span>
        </div>
      );
    },
  },
  {
    id: "effect_size",
    accessorKey: "effect_size",
    header: "Effect (\u03b2)",
    enableSorting: true,
    meta: { description: "Regression slope: normalized expression change per ALT allele copy. Positive = upregulation, negative = downregulation." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className={cn("text-xs tabular-nums", v > 0 ? "text-emerald-600" : v < 0 ? "text-destructive" : "text-muted-foreground")}>
          {v > 0 ? "+" : ""}{v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
    meta: { description: "Passed gene-level permutation threshold (GTEx: Bonferroni-corrected qval<0.05)" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className={getValue() ? "text-emerald-600 text-xs font-medium" : "text-muted-foreground/40 text-xs"}>
        {getValue() ? "Yes" : "No"}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config (without source — that's now a dimension/tab)
// ---------------------------------------------------------------------------

function buildFilters(genes: string[]): ServerFilterConfig[] {
  return [
    tissueGroupFilter(),
    {
      id: "gene",
      label: "Gene",
      type: "select",
      placeholder: "All genes",
      options: genes.map((g) => ({ value: g, label: g })),
    },
    significantOnlyFilter(),
  ];
}

// ---------------------------------------------------------------------------
// Forest plot
// ---------------------------------------------------------------------------

async function fetchForestData(ref: string, source: string, tissueGroup?: string): Promise<QtlRow[]> {
  const params = new URLSearchParams({ source, limit: "100", sort_by: "neglog_pvalue", sort_dir: "desc" });
  if (tissueGroup) params.set("tissue_group", tissueGroup);
  const res = await fetch(`${API_BASE}/variants/${encodeURIComponent(ref)}/qtls?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

interface GeneAgg {
  gene: string;
  bestEffect: number;
  bestPvalue: number;
  count: number;
  points: Array<{
    effectSize: number;
    neglogPvalue: number;
    tissueGroup: string;
    tissueName: string;
  }>;
}

function aggregateByGene(rows: QtlRow[]): GeneAgg[] {
  const map = new Map<string, GeneAgg>();

  for (const row of rows) {
    const gene = row.gene_symbol;
    if (!gene) continue;
    const effect = row.effect_size;
    if (effect == null) continue;

    let agg = map.get(gene);
    if (!agg) {
      agg = { gene, bestEffect: 0, bestPvalue: 0, count: 0, points: [] };
      map.set(gene, agg);
    }

    if (Math.abs(effect) > Math.abs(agg.bestEffect)) agg.bestEffect = effect;
    const nlp = row.neglog_pvalue ?? 0;
    if (nlp > agg.bestPvalue) agg.bestPvalue = nlp;

    const tg = row.tissue_group ?? "Other";
    agg.count++;
    agg.points.push({
      effectSize: effect,
      neglogPvalue: nlp,
      tissueGroup: tg,
      tissueName: row.tissue_name,
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.bestPvalue - a.bestPvalue)
    .slice(0, 15);
}

function getTissueGroupColor(group: string): string {
  const idx = (TISSUE_GROUPS as readonly string[]).indexOf(group);
  if (idx < 0) return CATEGORICAL_PALETTE[CATEGORICAL_PALETTE.length - 1];
  return CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length];
}

/** Deterministic color from a string (for individual tissue names). */
function hashStringColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return CATEGORICAL_PALETTE[Math.abs(h) % CATEGORICAL_PALETTE.length];
}

function QtlForestPlot({
  loc,
  source,
  tissueGroup,
}: {
  loc: string;
  source: string;
  tissueGroup?: string;
}) {
  const { data: rawRows, isLoading } = useQuery({
    queryKey: ["qtl-forest", loc, source, tissueGroup],
    queryFn: () => fetchForestData(loc, source, tissueGroup),
    staleTime: 5 * 60 * 1000,
  });

  const genes = useMemo(() => aggregateByGene(rawRows ?? []), [rawRows]);

  // Symmetric x-axis range: -maxAbs to +maxAbs
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const g of genes) {
      for (const p of g.points) {
        const a = Math.abs(p.effectSize);
        if (a > m) m = a;
      }
    }
    return m * 1.15 || 1; // 15% padding, fallback to 1 if no data
  }, [genes]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <div className="text-sm font-medium text-foreground">Effect Sizes by Gene</div>
          <div className="text-xs text-muted-foreground">Loading...</div>
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-20 h-3 bg-muted rounded animate-pulse" />
              <div className="flex-1 h-3 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!genes.length) return null;

  const rowH = 28;
  const labelW = 90;
  const toPercent = (effect: number) => ((effect + maxAbs) / (2 * maxAbs)) * 100;
  const zeroPct = 50; // center

  // When filtered to one tissue group, color by individual tissue instead
  const colorByTissue = Boolean(tissueGroup);

  // Collect legend items
  const legendItems = useMemo(() => {
    if (colorByTissue) {
      // Individual tissues within the group
      const names = Array.from(new Set(genes.flatMap((g) => g.points.map((p) => p.tissueName)))).sort();
      return names.map((n) => ({ label: formatTissueName(n), color: hashStringColor(n) }));
    }
    // Tissue groups
    const groups = Array.from(new Set(genes.flatMap((g) => g.points.map((p) => p.tissueGroup)))).sort((a, b) => {
      const ai = (TISSUE_GROUPS as readonly string[]).indexOf(a);
      const bi = (TISSUE_GROUPS as readonly string[]).indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return groups.map((g) => ({ label: g, color: getTissueGroupColor(g) }));
  }, [genes, colorByTissue]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Effect Sizes by Gene</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top genes by significance, showing all QTL effect sizes colored by tissue group
          </p>
        </div>

        <div className="px-4 py-3">
          {/* Direction labels */}
          <div className="flex items-center" style={{ paddingLeft: labelW }}>
            <div className="flex-1 flex justify-between px-1">
              <span className="text-[10px] text-destructive/50">Downregulated</span>
              <span className="text-[10px] text-emerald-600/50">Upregulated</span>
            </div>
          </div>

          {/* Forest plot rows */}
          {genes.map((g) => (
            <div key={g.gene} className="flex items-center" style={{ height: rowH }}>
              {/* Gene label */}
              <span
                className="text-xs font-medium text-muted-foreground truncate shrink-0 text-right pr-2"
                style={{ width: labelW }}
              >
                {g.gene}
              </span>

              {/* Plot area */}
              <div className="flex-1 relative" style={{ height: rowH }}>
                {/* Horizontal gridline */}
                <div
                  className="absolute left-0 right-0 border-b border-border/40"
                  style={{ top: rowH - 1 }}
                />

                {/* Zero reference line (rendered per row for z-stacking) */}
                <div
                  className="absolute top-0 border-l border-dashed"
                  style={{
                    left: `${zeroPct}%`,
                    height: rowH,
                    borderColor: "var(--muted-foreground)",
                    opacity: 0.15,
                  }}
                />

                {/* Data points */}
                {g.points.map((pt, pi) => {
                  const xPct = toPercent(pt.effectSize);
                  const r = Math.min(8, Math.max(3, 3 + Math.sqrt(pt.neglogPvalue) * 0.5));
                  const color = colorByTissue ? hashStringColor(pt.tissueName) : getTissueGroupColor(pt.tissueGroup);

                  return (
                    <Tooltip key={pi}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute top-1/2 rounded-full cursor-default transition-transform hover:scale-150"
                          style={{
                            left: `${xPct}%`,
                            width: r * 2,
                            height: r * 2,
                            backgroundColor: color,
                            opacity: 0.7,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{g.gene} in {formatTissueName(pt.tissueName)}</div>
                        <div className="text-muted-foreground">
                          {"\u03b2"} = {pt.effectSize > 0 ? "+" : ""}{pt.effectSize.toFixed(3)}
                        </div>
                        <div className="text-muted-foreground">
                          {"\u2212log\u2081\u2080(p)"} = {pt.neglogPvalue.toFixed(1)}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}

          {/* X axis */}
          <div className="flex items-start" style={{ paddingTop: 2 }}>
            <div style={{ width: labelW }} className="shrink-0" />
            <div className="flex-1 relative" style={{ height: 24 }}>
              {/* Axis line */}
              <div className="absolute top-0 left-0 right-0 border-t border-border" />
              {/* Zero tick */}
              <div className="absolute" style={{ left: `${zeroPct}%`, top: 0 }}>
                <div className="border-l border-border" style={{ height: 4 }} />
                <span
                  className="text-xs tabular-nums text-muted-foreground absolute"
                  style={{ transform: "translateX(-50%)", top: 6, whiteSpace: "nowrap" }}
                >
                  0
                </span>
              </div>
              {/* Negative tick */}
              <div className="absolute" style={{ left: `${toPercent(-maxAbs * 0.5)}%`, top: 0 }}>
                <div className="border-l border-border" style={{ height: 4 }} />
                <span
                  className="text-xs tabular-nums text-muted-foreground absolute"
                  style={{ transform: "translateX(-50%)", top: 6, whiteSpace: "nowrap" }}
                >
                  {(-maxAbs * 0.5).toFixed(2)}
                </span>
              </div>
              {/* Positive tick */}
              <div className="absolute" style={{ left: `${toPercent(maxAbs * 0.5)}%`, top: 0 }}>
                <div className="border-l border-border" style={{ height: 4 }} />
                <span
                  className="text-xs tabular-nums text-muted-foreground absolute"
                  style={{ transform: "translateX(-50%)", top: 6, whiteSpace: "nowrap" }}
                >
                  {(maxAbs * 0.5).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Axis label */}
          <div className="flex items-center" style={{ paddingTop: 2 }}>
            <div style={{ width: labelW }} className="shrink-0" />
            <div className="flex-1 text-center text-xs text-muted-foreground">
              Effect size ({"\u03b2"})
            </div>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-3">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div
                  className="rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: item.color, opacity: 0.7 }}
                />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const QTLS_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best \u2212log\u2081\u2080(p)",
  metricDescription: "Strongest QTL association significance across all 7 sources in this tissue group",
  countLabel: "Associations",
  formatMetric: (v) => v.toFixed(1),
  sqrtScale: true,
  showSignificant: true,
  showTopItem: true,
  topItemLabel: "Top Gene",
};

interface QtlsViewProps {
  loc: string;
  totalCount: number;
  genes: string[];
  initialData?: PaginatedResponse<QtlRow>;
  groupedData?: TissueGroupRow[];
}

export function QtlsView({ loc, totalCount, genes, initialData, groupedData }: QtlsViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={QTLS_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total associations`}
      />
    );
  }

  return (
    <QtlsDetailView loc={loc} totalCount={totalCount} genes={genes} initialData={initialData} />
  );
}

function QtlsDetailView({ loc, totalCount, genes, initialData }: Omit<QtlsViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();
  const activeSource = searchParams.get("source") || "gtex";

  const filters = useMemo(() => buildFilters(genes), [genes]);

  const { data, pageInfo, isLoading, isFetching } = useQtlsQuery({ ref: loc, initialData });

  const handleSourceChange = useCallback((source: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("source", source);
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, false);
  }, []);

  const sourceDimension: DimensionConfig = useMemo(() => ({
    label: "Source",
    options: QTL_SOURCES.map((s) => ({ value: s.id, label: s.label })),
    value: activeSource,
    onChange: handleSourceChange,
    presentation: "segmented",
  }), [activeSource, handleSourceChange]);

  const hasActiveFilters = Boolean(
    searchParams.get("gene") ||
    searchParams.get("tissue_group") || searchParams.get("significant_only")
  );
  const liveTotal = pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({ filters, serverPagination: true, paginationInfo });

  const sourceInfo = QTL_SOURCES.find((s) => s.id === activeSource);
  const subtitle = liveTotal != null
    ? `${liveTotal.toLocaleString()} ${sourceInfo?.label ?? "QTL"} associations`
    : `${sourceInfo?.label ?? "QTL"} associations for variants in this region`;

  return (
    <div className="space-y-4">
      <TissueGroupBackButton />
      <QtlForestPlot
        loc={loc}
        source={activeSource}
        tissueGroup={searchParams.get("tissue_group") || undefined}
      />
      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        dimensions={[sourceDimension]}
        searchPlaceholder="Search genes, tissues..."
        searchColumn="gene_symbol"
        exportable
        exportFilename={`qtls-${activeSource}-${loc}`}
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
        emptyMessage="No QTL associations found for variants in this region"
      />
    </div>
  );
}
