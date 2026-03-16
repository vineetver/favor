"use client";

import Link from "next/link";
import { DataSurface } from "@shared/components/ui/data-surface";
import { formatTissueName } from "@shared/utils/tissue-format";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { updateClientUrl } from "@shared/hooks";
import type { TissueScoreRow, PaginatedResponse } from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Client fetch
// ---------------------------------------------------------------------------

interface TissueScoreFilters {
  score_type?: string;
  tissue?: string;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchClient(
  ref: string,
  filters: TissueScoreFilters,
): Promise<PaginatedResponse<TissueScoreRow>> {
  const params = new URLSearchParams();
  if (filters.score_type) params.set("score_type", filters.score_type);
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));
  const res = await fetch(`/api/v1/variants/${encodeURIComponent(ref)}/tissue-scores?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function parseFilters(sp: URLSearchParams): TissueScoreFilters {
  const f: TissueScoreFilters = {};
  const scoreType = sp.get("score_type");
  if (scoreType && scoreType !== "all") f.score_type = scoreType;
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  f.sort_by = sp.get("sort_by") || "score";
  f.sort_dir = sp.get("sort_dir") || "desc";
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Dash() {
  return <span className="text-muted-foreground/40">&mdash;</span>;
}

const SCORE_TYPE_LABELS: Record<string, string> = {
  tland: "TLand",
  tland_light: "TLand-light",
  tland_lightest: "TLand-lightest",
  caqtl: "caQTL",
  cv2f: "cV2F",
};

const SCORE_TYPE_DESCRIPTIONS: Record<string, string> = {
  tland: "Tissue-Landscape: regulatory effect score integrating multiple epigenomic features",
  tland_light: "TLand lightweight model variant",
  tland_lightest: "TLand lightest model variant",
  caqtl: "Chromatin accessibility QTL-based score",
  cv2f: "Cell-type Variant-to-Function: probability of variant being functional in this tissue",
};

// ---------------------------------------------------------------------------
// Columns — variant_tissue_scores (27.0M rows)
// Scores range [0.025, 1.0]. Higher = more likely functional in tissue.
// ---------------------------------------------------------------------------

function VariantCell({ row }: { row: TissueScoreRow }) {
  const vcf = row.variant_vcf;
  if (!vcf) return <Dash />;
  return (
    <div>
      <Link
        href={`/hg38/variant/${encodeURIComponent(vcf)}`}
        className="font-mono text-xs text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {vcf}
      </Link>
      {row.position != null && (
        <span className="block text-[10px] tabular-nums text-muted-foreground">
          pos {row.position.toLocaleString()}
        </span>
      )}
    </div>
  );
}

const columns: ColumnDef<TissueScoreRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => <VariantCell row={row.original} />,
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    meta: { description: "Tissue where the variant functional score was computed (51 tissues)" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "score_type",
    accessorKey: "score_type",
    header: "Type",
    enableSorting: false,
    meta: {
      description: "Score model: TLand (Tissue-Landscape regulatory effect), cV2F (cell-type Variant-to-Function probability), caQTL (chromatin accessibility QTL-based), or TLand lightweight variants.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const raw = getValue() as string;
      const label = SCORE_TYPE_LABELS[raw] ?? raw;
      return <span className="text-xs font-medium text-foreground">{label}</span>;
    },
  },
  {
    id: "score",
    accessorKey: "score",
    header: "Score",
    enableSorting: true,
    meta: {
      description: "Tissue-specific functional impact score (0\u20131). Higher = more likely the variant is functional in this tissue. Range: 0.025\u20131.0.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v == null) return <Dash />;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(v * 100, 1)}%`, opacity: Math.max(0.4, v) }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground font-medium">{v.toFixed(3)}</span>
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface TissueScoresViewProps {
  loc: string;
  totalCount: number;
  initialData?: PaginatedResponse<TissueScoreRow>;
}

const SCORE_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  ...Object.entries(SCORE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function TissueScoresView({ loc, totalCount, initialData }: TissueScoresViewProps) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);
  const activeScoreType = searchParams.get("score_type") || "all";
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["tissue-scores", loc, filters],
    queryFn: () => fetchClient(loc, filters),
    placeholderData: (prev: PaginatedResponse<TissueScoreRow> | undefined) => prev,
    staleTime: 5 * 60 * 1000,
    ...(isFirstMount.current && initialData ? { initialData } : {}),
  });

  useEffect(() => { isFirstMount.current = false; }, []);

  const data = query.data?.data ?? [];
  const pageInfo = query.data?.page_info;

  const handleScoreTypeChange = useCallback((type: string) => {
    const params = new URLSearchParams(window.location.search);
    if (type === "all") {
      params.delete("score_type");
    } else {
      params.set("score_type", type);
    }
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, false);
  }, []);

  const scoreTypeDimension: DimensionConfig = useMemo(() => ({
    label: "Model",
    options: SCORE_TYPE_OPTIONS,
    value: activeScoreType,
    onChange: handleScoreTypeChange,
    presentation: "segmented",
  }), [activeScoreType, handleScoreTypeChange]);

  const hasActiveFilters = Boolean(searchParams.get("score_type") || searchParams.get("tissue"));
  const liveTotal = pageInfo?.total_count ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal ?? undefined,
    pageSize: 25,
    hasMore: pageInfo?.has_more ?? false,
    currentCursor: pageInfo?.next_cursor ?? null,
  };

  const tableState = useServerTable({ filters: [], serverPagination: true, paginationInfo });

  const subtitle = liveTotal != null
    ? `${liveTotal.toLocaleString()} tissue-specific variant functional scores across 51 tissues`
    : "Tissue-specific variant functional scores (TLand, cV2F, caQTL)";

  return (
    <DataSurface
      data={data}
      columns={columns}
      subtitle={subtitle}
      dimensions={[scoreTypeDimension]}
      searchPlaceholder="Search tissues..."
      searchColumn="tissue_name"
      exportable
      exportFilename={`tissue-scores-${activeScoreType}-${loc}`}
      loading={query.isLoading && data.length === 0}
      transitioning={query.isFetching && data.length > 0}
      serverPagination={tableState.pagination}
      serverSort={tableState.serverSort}
      pageSizeOptions={[25, 50, 100]}
      emptyMessage="No tissue scores found for variants in this region"
    />
  );
}
