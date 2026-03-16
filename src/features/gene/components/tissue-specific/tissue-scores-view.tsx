"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { formatTissueName, TISSUE_GROUPS } from "@shared/utils/tissue-format";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TissueScoreRow, PaginatedResponse } from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Client fetch
// ---------------------------------------------------------------------------

interface TissueScoreFilters {
  score_type?: string;
  tissue?: string;
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
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));
  const res = await fetch(
    `/api/v1/variants/${encodeURIComponent(ref)}/tissue-scores?${params}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function parseFilters(sp: URLSearchParams): TissueScoreFilters {
  const f: TissueScoreFilters = {};
  const scoreType = sp.get("score_type");
  if (scoreType) f.score_type = scoreType;
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<TissueScoreRow, unknown>[] = [
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    meta: {
      description: "Tissue where the variant functional score was computed",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "tissue_group",
    accessorKey: "tissue_group",
    header: "Group",
    enableSorting: false,
    meta: { description: "Tissue group" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      if (!v)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return <span className="text-xs text-muted-foreground">{v}</span>;
    },
  },
  {
    id: "score_type",
    accessorKey: "score_type",
    header: "Type",
    enableSorting: false,
    meta: {
      description:
        "cV2F = context-dependent Variant-to-Function score (how likely this variant is functional in this tissue). TLand = Tissue Landscape score (tissue-specific regulatory potential).",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-xs font-medium text-foreground uppercase">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "score",
    accessorKey: "score",
    header: "Score",
    enableSorting: false,
    meta: {
      description:
        "Tissue-specific functional impact score (0\u20131). Higher = more likely the variant is functional in this tissue. >0.5 is generally considered high evidence.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(v * 100, 1)}%`,
                opacity: Math.max(0.4, v),
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground font-medium">
            {v.toFixed(3)}
          </span>
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

export function TissueScoresView({
  loc,
  totalCount,
  initialData,
}: TissueScoresViewProps) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["tissue-scores", loc, filters],
    queryFn: () => fetchClient(loc, filters),
    placeholderData: (prev: PaginatedResponse<TissueScoreRow> | undefined) =>
      prev,
    staleTime: 5 * 60 * 1000,
    ...(isFirstMount.current && initialData ? { initialData } : {}),
  });

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  const data = query.data?.data ?? [];
  const pageInfo = query.data?.page_info;

  const hasActiveFilters = Boolean(
    searchParams.get("score_type") || searchParams.get("tissue")
  );
  const liveTotal =
    pageInfo?.total_count ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal ?? undefined,
    pageSize: 25,
    hasMore: pageInfo?.has_more ?? false,
    currentCursor: pageInfo?.next_cursor ?? null,
  };

  const filterConfigs = useMemo(
    (): ServerFilterConfig[] => [
      {
        id: "score_type",
        label: "Score Type",
        type: "select",
        placeholder: "All types",
        options: [
          { value: "cv2f", label: "cV2F (Variant-to-Function)" },
          { value: "tland", label: "TLand (Tissue Landscape)" },
        ],
      },
    ],
    []
  );

  const tableState = useServerTable({
    filters: filterConfigs,
    serverPagination: true,
    paginationInfo,
  });

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} tissue-specific variant functional scores`
      : "Tissue-specific variant functional scores (cV2F + TLand)";

  return (
    <DataSurface
      data={data}
      columns={columns}
      subtitle={subtitle}
      searchPlaceholder="Search tissues..."
      searchColumn="tissue_name"
      exportable
      exportFilename={`tissue-scores-${loc}`}
      filterable
      filters={filterConfigs}
      filterValues={tableState.filterValues}
      onFilterChange={tableState.onFilterChange}
      filterChips={tableState.filterChips}
      onRemoveFilterChip={tableState.onRemoveFilterChip}
      onClearFilters={tableState.onClearFilters}
      loading={query.isLoading && data.length === 0}
      transitioning={query.isFetching && data.length > 0}
      serverPagination={tableState.pagination}
      serverSort={tableState.serverSort}
      pageSizeOptions={[25, 50, 100]}
      emptyMessage="No tissue scores found for variants in this region"
    />
  );
}
