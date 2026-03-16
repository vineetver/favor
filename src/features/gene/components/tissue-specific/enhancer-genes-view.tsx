"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import {
  useServerTable,
  useClientSearchParams,
  updateClientUrl,
} from "@shared/hooks";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo } from "react";
import type {
  EnhancerGeneRow,
  PaginatedResponse,
} from "@features/gene/api/region";
import { useEnhancerGenesQuery } from "@features/gene/hooks/use-enhancer-genes-query";

// ============================================================================
// Method config
// ============================================================================

const METHODS = [
  { id: "abc", label: "ABC", desc: "Activity-By-Contact model" },
  { id: "epiraction", label: "EPIraction", desc: "Hi-C + epigenomic composite" },
  { id: "epimap", label: "EpiMap", desc: "Module-based linking" },
  { id: "re2g", label: "RE2G", desc: "ENCODE rE2G v3" },
] as const;

const STRONG_THRESHOLD: Record<string, number> = {
  abc: 0.02,
  epiraction: 0.001,
  epimap: 0.5,
  re2g: 0.02,
};

// ============================================================================
// Formatting helpers
// ============================================================================

function normalizeScore(score: number, method: string): number {
  if (score <= 0) return 0;
  if (method === "epiraction") {
    // Log-scale: 1e-6 → 0, 0.1 → 1
    return Math.min(1, Math.max(0, (Math.log10(score) + 6) / 5));
  }
  // sqrt spreads ABC/RE2G's typical 0.001–0.1 range
  return Math.min(1, Math.sqrt(score));
}

function formatScoreValue(
  score: number,
  method: string,
): React.ReactNode {
  if (method === "epiraction") {
    if (score === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(score)));
    const mantissa = score / Math.pow(10, exp);
    return (
      <span>
        {mantissa.toFixed(1)}&times;10
        <sup className="text-[9px]">{exp}</sup>
      </span>
    );
  }
  return score.toFixed(3);
}

function formatDist(d: number | null): string {
  if (d == null) return "\u2014";
  const abs = Math.abs(d);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)} Mb`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)} kb`;
  return `${abs} bp`;
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
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
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
): ColumnDef<EnhancerGeneRow, unknown> {
  return {
    id: `d_${key}`,
    header,
    enableSorting: false,
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
): ColumnDef<EnhancerGeneRow, unknown> {
  return {
    id: `d_${key}`,
    header,
    enableSorting: false,
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
  cell: ({ getValue }) => (
    <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
      {getValue() as string}
    </span>
  ),
};

const scoreCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "score",
  accessorKey: "score",
  header: "Score",
  enableSorting: true,
  cell: ({ row }) => (
    <ScoreCell score={row.original.score} method={row.original.method} />
  ),
};

const distCol: ColumnDef<EnhancerGeneRow, unknown> = {
  id: "distance",
  accessorKey: "distance",
  header: "Distance",
  enableSorting: true,
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
  header: "Region",
  enableSorting: true,
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
        geneCol,
        tissueCol,
        detailText("tissue_group", "Group"),
        scoreCol,
        detailNum("log10_score", "log\u2081\u2080", 3),
        {
          id: "d_direction",
          header: "\u2191\u2193",
          enableSorting: false,
          cell: ({ row }) => {
            const dir = row.original.detail?.direction as number | null;
            if (dir == null)
              return <span className="text-muted-foreground/40">&mdash;</span>;
            return (
              <span
                className={cn(
                  "text-xs font-medium",
                  dir === 1
                    ? "text-emerald-600"
                    : "text-amber-600",
                )}
              >
                {dir === 1 ? "\u2193 down" : "\u2191 up"}
              </span>
            );
          },
        },
        distCol,
        regionCol,
      ];

    case "epiraction":
      return [
        geneCol,
        tissueCol,
        detailText("element_class", "Class"),
        scoreCol,
        detailNum("h3k27ac", "H3K27ac"),
        detailNum("open_chromatin", "Open Chrom."),
        detailNum("hic_contacts", "Hi-C"),
        detailNum("hic_fold_change", "Hi-C FC"),
        detailNum("activity", "Activity"),
        distCol,
        regionCol,
      ];

    case "epimap":
      return [
        geneCol,
        detailText("gene_id", "Ensembl ID"),
        tissueCol,
        scoreCol,
        detailText("enhancer_id", "Module ID"),
        regionCol,
      ];

    case "re2g":
      return [
        geneCol,
        tissueCol,
        detailText("sub_method", "Sub-method"),
        detailText("element_class", "Class"),
        scoreCol,
        detailNum("activity_base", "Activity"),
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
        detailNum("hic_contact", "Hi-C", 4),
        distCol,
        regionCol,
      ];

    default:
      return [geneCol, tissueCol, scoreCol, distCol, regionCol];
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
  const active = METHODS.find((m) => m.id === activeMethod) ?? METHODS[0];

  return (
    <div className="space-y-1.5">
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
      <p className="text-xs text-muted-foreground">{active.desc}</p>
    </div>
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
    {
      id: "tissue",
      label: "Tissue",
      type: "select",
      placeholder: "All tissues",
      options: tissues.map((t) => ({ value: t, label: t })),
    },
  ];
}

// ============================================================================
// Main component
// ============================================================================

interface EnhancerGenesViewProps {
  loc: string;
  totalCount: number;
  genes: string[];
  tissues: string[];
  initialData?: PaginatedResponse<EnhancerGeneRow>;
}

export function EnhancerGenesView({
  loc,
  totalCount,
  genes,
  tissues,
  initialData,
}: EnhancerGenesViewProps) {
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
    searchParams.get("target_gene") || searchParams.get("tissue"),
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

  // Tab change: update method in URL, reset cursor
  const handleMethodChange = useCallback((method: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("method", method);
    params.delete("cursor");
    const pathname = window.location.pathname;
    updateClientUrl(`${pathname}?${params}`, false);
  }, []);

  const methodInfo = METHODS.find((m) => m.id === activeMethod) ?? METHODS[0];
  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} ${methodInfo.label} predictions across ${tissues.length} tissues`
      : `${methodInfo.label} predictions across ${tissues.length} tissues`;

  return (
    <div className="space-y-4">
      <MethodTabBar
        activeMethod={activeMethod}
        onMethodChange={handleMethodChange}
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
