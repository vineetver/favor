"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
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
  RegionSummary,
} from "@features/gene/api/region";
import { useChromatinQuery } from "@features/gene/hooks/use-chromatin-query";
import { RegionContextBar } from "./region-context-bar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { formatTissueName } from "@shared/utils/tissue-format";

function parseRegion(coords: string): [number, number] {
  const match = coords.match(/:(\d+)-(\d+)/);
  if (!match) return [0, 0];
  return [parseInt(match[1]), parseInt(match[2])];
}

// Roadmap 25-state names are cryptic ("TxEnh5'", "EnhA1"). Map to readable labels.
const READABLE_STATE: Record<string, string> = {
  "1_TssA": "Active TSS",
  "2_PromU": "Upstream Promoter",
  "3_PromD1": "Downstream Promoter 1",
  "4_PromD2": "Downstream Promoter 2",
  "5_Tx5'": "5\u2032 Transcription",
  "6_Tx": "Strong Transcription",
  "7_Tx3'": "3\u2032 Transcription",
  "8_TxWk": "Weak Transcription",
  "9_TxReg": "Transcription Regulatory",
  "10_TxEnh5'": "5\u2032 Transcription Enhancer",
  "11_TxEnh3'": "3\u2032 Transcription Enhancer",
  "12_TxEnhW": "Weak Tx Enhancer",
  "13_EnhA1": "Active Enhancer 1",
  "14_EnhA2": "Active Enhancer 2",
  "15_EnhAF": "Flanking Active Enhancer",
  "16_EnhW1": "Weak Enhancer 1",
  "17_EnhW2": "Weak Enhancer 2",
  "18_EnhAc": "Acetylated Enhancer",
  "19_DNase": "Open Chromatin (DNase)",
  "20_ZNF/Rpts": "ZNF Genes / Repeats",
  "21_Het": "Heterochromatin",
  "22_PromP": "Poised Promoter",
  "23_PromBiv": "Bivalent Promoter",
  "24_ReprPC": "Polycomb Repressed",
  "25_Quies": "Quiescent",
};

function readableStateName(code: string, fallback: string): string {
  return READABLE_STATE[code] ?? fallback;
}

// ---------------------------------------------------------------------------
// ChromatinTrackViz — multi-tissue segment track
// ---------------------------------------------------------------------------

async function fetchTrackData(loc: string): Promise<ChromatinStateRow[]> {
  const params = new URLSearchParams({
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

function ChromatinTrackViz({
  loc,
  regionStart,
  regionEnd,
}: {
  loc: string;
  regionStart: number;
  regionEnd: number;
}) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["chromatin-track-viz", loc],
    queryFn: () => fetchTrackData(loc),
    staleTime: 10 * 60 * 1000,
  });

  // Group rows by tissue, pick top 8 tissues by segment count
  const { tissueRows, legend } = useMemo(() => {
    if (!rows?.length) return { tissueRows: [], legend: [] };

    const byTissue = new Map<string, ChromatinStateRow[]>();
    const stateMap = new Map<string, { name: string; color: string }>();

    for (const row of rows) {
      const existing = byTissue.get(row.tissue_name);
      if (existing) existing.push(row);
      else byTissue.set(row.tissue_name, [row]);

      if (!stateMap.has(row.state_code)) {
        stateMap.set(row.state_code, {
          name: readableStateName(row.state_code, row.state_name),
          color: row.state_color,
        });
      }
    }

    // Top 8 tissues by segment count
    const sorted = [...byTissue.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    const legendEntries = [...stateMap.entries()]
      .sort((a, b) => {
        const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
        const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .map(([code, info]) => ({ code, ...info }));

    return {
      tissueRows: sorted.map(([tissue, segs]) => ({ tissue, segs })),
      legend: legendEntries,
    };
  }, [rows]);

  const regionSpan = regionEnd - regionStart;

  if (regionStart === 0) return null;

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-52 bg-muted rounded" />
          <div className="h-32 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  if (!tissueRows.length) return null;

  // Ruler ticks
  const midpoint = Math.round((regionStart + regionEnd) / 2);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Chromatin State Track
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top {tissueRows.length} tissues by annotation density
          </p>
        </div>

        <div className="px-4 py-3">
          {/* Coordinate ruler */}
          <div
            className="flex justify-between text-[9px] tabular-nums text-muted-foreground mb-2"
            style={{ marginLeft: 150 }}
          >
            <span>{regionStart.toLocaleString()}</span>
            <span>{midpoint.toLocaleString()}</span>
            <span>{regionEnd.toLocaleString()}</span>
          </div>

          {/* Tissue rows */}
          <div className="space-y-0.5">
            {tissueRows.map(({ tissue, segs }) => (
              <div key={tissue} className="flex items-center gap-3">
                <span
                  className="text-[11px] text-muted-foreground truncate shrink-0 text-right"
                  style={{ width: 140 }}
                  title={formatTissueName(tissue)}
                >
                  {formatTissueName(tissue)}
                </span>
                <div className="flex-1 h-8 relative bg-muted/20 rounded-sm">
                  {segs.map((seg, i) => {
                    const left =
                      ((seg.start - regionStart) / regionSpan) * 100;
                    const width = Math.max(
                      ((seg.end - seg.start) / regionSpan) * 100,
                      0.5,
                    );
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-0 h-full cursor-pointer hover:brightness-110 hover:z-10"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: seg.state_color || "#888",
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-sm max-w-xs">
                          <p className="font-medium">
                            {readableStateName(seg.state_code, seg.state_name)}
                          </p>
                          <p className="text-muted-foreground">
                            {seg.start.toLocaleString()}&ndash;{seg.end.toLocaleString()}
                            {" "}&middot;{" "}
                            {(seg.end - seg.start).toLocaleString()} bp
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-border">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {legend.map(({ code, name, color }) => (
              <div
                key={code}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<ChromatinStateRow, unknown>[] = [
  {
    id: "state_code",
    accessorKey: "state_code",
    header: "State",
    enableSorting: false,
    meta: { description: "Roadmap 25-state chromatin state code" } satisfies ColumnMeta,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-sm border border-border/50 shrink-0"
          style={{ backgroundColor: row.original.state_color || "#888" }}
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
    meta: {
      description:
        "Chromatin state annotation (e.g., Active TSS, Genic Enhancer)",
    } satisfies ColumnMeta,
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {readableStateName(row.original.state_code, row.original.state_name)}
      </span>
    ),
  },
  {
    id: "state_category",
    accessorKey: "state_category",
    header: "Category",
    enableSorting: false,
    meta: {
      description:
        "Functional category: promoter, enhancer, transcription, heterochromatin, quiescent, repressed, bivalent",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground capitalize">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Biosample",
    enableSorting: true,
    meta: { description: "Roadmap Epigenomics biosample (850 unique)" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "position",
    accessorFn: (row) => row.start,
    header: "Coordinates",
    enableSorting: true,
    meta: {
      description: "Genomic coordinates of the chromatin state segment",
    } satisfies ColumnMeta,
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
    meta: { description: "Segment length in base pairs" } satisfies ColumnMeta,
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
  summary?: RegionSummary | null;
  basePath?: string;
}

export function ChromatinStatesView({
  loc,
  tissues,
  categories,
  totalCount,
  regionCoords,
  initialData,
  summary,
  basePath,
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

  const [regionStart, regionEnd] = useMemo(
    () => parseRegion(regionCoords),
    [regionCoords],
  );

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} annotations across ${tissues.length} biosamples`
      : `Annotations across ${tissues.length} biosamples`;

  return (
    <div className="space-y-6">
      {summary && basePath && (
        <RegionContextBar
          summary={summary}
          basePath={basePath}
          currentSlug="chromatin-states"
        />
      )}

      <ChromatinTrackViz
        loc={loc}
        regionStart={regionStart}
        regionEnd={regionEnd}
      />

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
