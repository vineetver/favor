"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import type {
  ServerFilterConfig,
  ServerPaginationInfo,
} from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type {
  ChromatinStateRow,
  PaginatedResponse,
} from "@features/gene/api/region";
import { useChromatinQuery } from "@features/gene/hooks/use-chromatin-query";

// ---------------------------------------------------------------------------
// Roadmap 25-state model colors
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  E1: "#ff0000", E2: "#ff4500", E3: "#ff4500", E4: "#ff4500",
  E5: "#008000", E6: "#006400", E7: "#006400", E8: "#009600",
  E9: "#c2e105", E10: "#c2e105", E11: "#c2e105", E12: "#c2e105",
  E13: "#ffc34d", E14: "#ffc34d", E15: "#ffff00", E16: "#ffff00",
  E17: "#ffff00", E18: "#c5912b", E19: "#66cdaa", E20: "#8a91d0",
  E21: "#808080", E22: "#cd5c5c", E23: "#f5f5dc", E24: "#bdb76b",
  E25: "#f5f5f5",
};

// ---------------------------------------------------------------------------
// Track preview — fetches all segments for ONE tissue (bounded, single page)
// ---------------------------------------------------------------------------

async function fetchTissueTrack(
  loc: string,
  tissue: string,
): Promise<ChromatinStateRow[]> {
  const params = new URLSearchParams({
    tissue,
    limit: "100",
    sort_by: "position",
    sort_dir: "asc",
  });
  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/chromatin-states?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

function formatTissueName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\((\d+)\s+(Years?|Days?)\)/gi, "($1 $2)");
}

function TissueTrackPreview({
  loc,
  tissue,
  regionStart,
  regionEnd,
}: {
  loc: string;
  tissue: string;
  regionStart: number;
  regionEnd: number;
}) {
  const { data: segments, isLoading } = useQuery({
    queryKey: ["chromatin-track", loc, tissue],
    queryFn: () => fetchTissueTrack(loc, tissue),
    staleTime: 10 * 60 * 1000,
  });

  const regionSpan = regionEnd - regionStart;

  if (isLoading) {
    return <div className="animate-pulse h-8 bg-muted/50 rounded" />;
  }

  if (!segments?.length) return null;

  const legendItems = new Map<string, { name: string; color: string }>();
  for (const seg of segments) {
    if (!legendItems.has(seg.state_code)) {
      legendItems.set(seg.state_code, {
        name: seg.state_name,
        color: STATE_COLORS[seg.state_code] ?? "#888",
      });
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">
          {formatTissueName(tissue)}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {segments.length} chromatin state segments
        </p>
      </div>

      <div className="px-4 py-3">
        <div className="flex justify-between text-[9px] tabular-nums text-muted-foreground mb-1">
          <span>{regionStart.toLocaleString()}</span>
          <span>
            {Math.round((regionStart + regionEnd) / 2).toLocaleString()}
          </span>
          <span>{regionEnd.toLocaleString()}</span>
        </div>

        <div className="h-8 relative bg-muted/30 rounded">
          {segments.map((seg, i) => {
            const left = ((seg.start - regionStart) / regionSpan) * 100;
            const width = Math.max(
              ((seg.end - seg.start) / regionSpan) * 100,
              0.3,
            );
            return (
              <div
                key={i}
                className="absolute top-0 h-full rounded-[2px]"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: STATE_COLORS[seg.state_code] ?? "#888",
                }}
                title={`${seg.state_name}\n${seg.start.toLocaleString()}\u2013${seg.end.toLocaleString()} (${(seg.end - seg.start).toLocaleString()} bp)`}
              />
            );
          })}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[...legendItems.entries()]
            .sort(
              (a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)),
            )
            .map(([code, { name, color }]) => (
              <div
                key={code}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <div
                  className="w-3 h-3 rounded-sm border border-border/50"
                  style={{ backgroundColor: color }}
                />
                <span>{name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table columns — tissue_name and position are server-sortable
// ---------------------------------------------------------------------------

const columns: ColumnDef<ChromatinStateRow, unknown>[] = [
  {
    id: "state_code",
    accessorKey: "state_code",
    header: "State",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-sm border border-border/50 shrink-0"
          style={{
            backgroundColor:
              STATE_COLORS[row.original.state_code] ?? "#888",
          }}
        />
        <span className="text-xs font-mono text-foreground">
          {row.original.state_code}
        </span>
      </div>
    ),
  },
  {
    id: "state_name",
    accessorKey: "state_name",
    header: "Name",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-sm text-foreground">{getValue() as string}</span>
    ),
  },
  {
    id: "state_category",
    accessorKey: "state_category",
    header: "Category",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground capitalize">
        {getValue() as string}
      </span>
    ),
  },
  {
    // ID matches API sort_by value
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    // ID matches API sort_by "position"
    id: "position",
    accessorFn: (row) => row.start,
    header: "Coordinates",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {row.original.start.toLocaleString()}&ndash;
        {row.original.end.toLocaleString()}
      </span>
    ),
  },
  {
    id: "length",
    header: "Length",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {(row.original.end - row.original.start).toLocaleString()} bp
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(
  tissues: string[],
  categories: string[],
): ServerFilterConfig[] {
  return [
    {
      id: "tissue",
      label: "Tissue",
      type: "select",
      placeholder: "All tissues",
      options: tissues.map((t) => ({ value: t, label: formatTissueName(t) })),
    },
    {
      id: "state_category",
      label: "Category",
      type: "select",
      placeholder: "All categories",
      options: categories.map((c) => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
      })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ChromatinStatesViewProps {
  loc: string;
  tissues: string[];
  categories: string[];
  totalCount: number;
  regionCoords: string;
  initialData?: PaginatedResponse<ChromatinStateRow>;
}

export function ChromatinStatesView({
  loc,
  tissues,
  categories,
  totalCount,
  regionCoords,
  initialData,
}: ChromatinStatesViewProps) {
  const filters = useMemo(
    () => buildFilters(tissues, categories),
    [tissues, categories],
  );

  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useChromatinQuery({
    loc,
    initialData,
  });

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") || searchParams.get("state_category"),
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

  const [regionStart, regionEnd] = useMemo(() => {
    const match = regionCoords.match(/:(\d+)-(\d+)/);
    if (!match) return [0, 0];
    return [parseInt(match[1]), parseInt(match[2])];
  }, [regionCoords]);

  const selectedTissue = searchParams.get("tissue");

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} annotations across ${tissues.length} biosamples`
      : `Annotations across ${tissues.length} biosamples`;

  return (
    <div className="space-y-6">
      {selectedTissue && regionStart > 0 && (
        <TissueTrackPreview
          loc={loc}
          tissue={selectedTissue}
          regionStart={regionStart}
          regionEnd={regionEnd}
        />
      )}

      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search states, tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`chromatin-states-${loc}`}
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
        emptyMessage="No chromatin state annotations found for this region"
      />
    </div>
  );
}
