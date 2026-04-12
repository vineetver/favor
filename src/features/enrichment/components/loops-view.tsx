"use client";

import type {
  LoopRow,
  PaginatedResponse,
  RegionSummary,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useLoopsQuery } from "@features/enrichment/hooks/use-loops-query";
import { DataSurface } from "@shared/components/ui/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useClientSearchParams, useServerTable } from "@shared/hooks";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { tissueFilter, tissueGroupFilter } from "./filter-helpers";
import { TissueGroupBackButton } from "./tissue-group-back-button";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupSummary } from "./tissue-group-summary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { formatTissueName } from "@shared/utils/tissue-format";

function parseRegion(coords: string): [number, number] {
  const match = coords.match(/:(\d+)-(\d+)/);
  if (!match) return [0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10)];
}

// Deterministic color per tissue
const TISSUE_PALETTE = [
  "oklch(0.51 0.21 286.5)", // primary violet
  "oklch(0.55 0.18 230)", // blue
  "oklch(0.60 0.16 160)", // teal
  "oklch(0.55 0.20 30)", // red-orange
  "oklch(0.58 0.15 80)", // amber
  "oklch(0.50 0.18 320)", // magenta
];

function tissueColor(tissue: string, tissues: string[]): string {
  const idx = tissues.indexOf(tissue);
  return TISSUE_PALETTE[idx % TISSUE_PALETTE.length];
}

// ---------------------------------------------------------------------------
// LoopArcDiagram — SVG arc visualization
// ---------------------------------------------------------------------------

const SVG_WIDTH = 800;
const SVG_HEIGHT = 200;
const TRACK_Y = SVG_HEIGHT - 30;
const ARC_AREA_TOP = 16;

function LoopArcDiagram({
  rows,
  regionStart,
  regionEnd,
  tissues,
}: {
  rows: LoopRow[];
  regionStart: number;
  regionEnd: number;
  tissues: string[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute coordinate bounds from both region and loop anchors
  const { minCoord, maxCoord } = useMemo(() => {
    let lo = regionStart;
    let hi = regionEnd;
    for (const r of rows) {
      lo = Math.min(lo, r.anchor1_start);
      hi = Math.max(hi, r.anchor2_end);
    }
    // Pad 2% on each side
    const pad = (hi - lo) * 0.02;
    return { minCoord: lo - pad, maxCoord: hi + pad };
  }, [rows, regionStart, regionEnd]);

  const span = maxCoord - minCoord;
  const scale = (pos: number) => ((pos - minCoord) / span) * SVG_WIDTH;

  // Gene body position
  const geneX1 = scale(regionStart);
  const geneX2 = scale(regionEnd);

  // Midpoint ruler
  const midCoord = Math.round((minCoord + maxCoord) / 2);

  // Sort arcs by span descending so smaller arcs render on top
  const sortedArcs = useMemo(
    () =>
      rows
        .map((r, i) => ({ ...r, origIdx: i }))
        .sort((a, b) => b.loop_span - a.loop_span),
    [rows],
  );

  const maxSpan = sortedArcs.length > 0 ? sortedArcs[0].loop_span : 1;

  if (!rows.length) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Chromatin Loop Arcs
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} loop{rows.length !== 1 ? "s" : ""} &middot; arc height
            proportional to span &middot; color = tissue
          </p>
        </div>

        <div className="px-4 py-3">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full"
            style={{ maxHeight: 240 }}
            role="img"
            aria-label="Chromatin loops overview"
          >
            <title>Chromatin loops overview</title>
            {/* Coordinate ruler */}
            <line
              x1={0}
              y1={TRACK_Y}
              x2={SVG_WIDTH}
              y2={TRACK_Y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
            <text
              x={2}
              y={TRACK_Y + 14}
              className="text-muted-foreground"
              fill="currentColor"
              fontSize={9}
              fontFamily="monospace"
            >
              {Math.round(minCoord).toLocaleString()}
            </text>
            <text
              x={SVG_WIDTH / 2}
              y={TRACK_Y + 14}
              textAnchor="middle"
              className="text-muted-foreground"
              fill="currentColor"
              fontSize={9}
              fontFamily="monospace"
            >
              {midCoord.toLocaleString()}
            </text>
            <text
              x={SVG_WIDTH - 2}
              y={TRACK_Y + 14}
              textAnchor="end"
              className="text-muted-foreground"
              fill="currentColor"
              fontSize={9}
              fontFamily="monospace"
            >
              {Math.round(maxCoord).toLocaleString()}
            </text>

            {/* Tick marks */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const x = frac * SVG_WIDTH;
              return (
                <line
                  key={frac}
                  x1={x}
                  y1={TRACK_Y - 3}
                  x2={x}
                  y2={TRACK_Y + 3}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  className="text-border"
                />
              );
            })}

            {/* Gene body */}
            <rect
              x={geneX1}
              y={TRACK_Y - 5}
              width={Math.max(geneX2 - geneX1, 2)}
              height={10}
              rx={2}
              className="fill-primary/20 stroke-primary/40"
              strokeWidth={0.5}
            />

            {/* Arcs */}
            {sortedArcs.map((loop) => {
              const a1Mid = scale((loop.anchor1_start + loop.anchor1_end) / 2);
              const a2Mid = scale((loop.anchor2_start + loop.anchor2_end) / 2);
              const arcSpanPct = loop.loop_span / maxSpan;
              const arcHeight =
                ARC_AREA_TOP + arcSpanPct * (TRACK_Y - ARC_AREA_TOP - 20);
              const cy = TRACK_Y - arcHeight;

              const d = `M ${a1Mid} ${TRACK_Y} Q ${(a1Mid + a2Mid) / 2} ${cy} ${a2Mid} ${TRACK_Y}`;
              const isHovered = hoveredIdx === loop.origIdx;
              const color = tissueColor(loop.tissue_name, tissues);

              return (
                <Tooltip key={loop.origIdx}>
                  <TooltipTrigger asChild>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG <path> cannot have a role; tooltip makes data reachable via keyboard on the row list below */}
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      strokeOpacity={isHovered ? 1 : 0.65}
                      className="cursor-pointer transition-[stroke-opacity,stroke-width]"
                      style={{ transitionDuration: "100ms" }}
                      onMouseEnter={() => setHoveredIdx(loop.origIdx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-sm max-w-xs">
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {formatTissueName(loop.tissue_name)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Anchor 1: {loop.anchor1_start.toLocaleString()}&ndash;
                        {loop.anchor1_end.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Anchor 2: {loop.anchor2_start.toLocaleString()}&ndash;
                        {loop.anchor2_end.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Span: {loop.loop_span.toLocaleString()} bp &middot;{" "}
                        {loop.assay_type}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Anchor marks on ruler */}
            {rows.map((loop, i) => {
              const a1x1 = scale(loop.anchor1_start);
              const a1x2 = scale(loop.anchor1_end);
              const a2x1 = scale(loop.anchor2_start);
              const a2x2 = scale(loop.anchor2_end);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: LoopRow has no stable id; list order is stable per render
                <g
                  key={`anchors-${loop.anchor1_start}-${loop.anchor2_start}-${i}`}
                >
                  <rect
                    x={a1x1}
                    y={TRACK_Y - 3}
                    width={Math.max(a1x2 - a1x1, 1.5)}
                    height={6}
                    rx={0.5}
                    fill={tissueColor(loop.tissue_name, tissues)}
                    opacity={0.5}
                  />
                  <rect
                    x={a2x1}
                    y={TRACK_Y - 3}
                    width={Math.max(a2x2 - a2x1, 1.5)}
                    height={6}
                    rx={0.5}
                    fill={tissueColor(loop.tissue_name, tissues)}
                    opacity={0.5}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tissue legend */}
        {tissues.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {tissues.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: tissueColor(t, tissues) }}
                  />
                  <span>{formatTissueName(t)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<LoopRow, unknown>[] = [
  {
    id: "anchor1",
    header: "Anchor 1",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-foreground">
        {row.original.anchor1_start.toLocaleString()}&ndash;
        {row.original.anchor1_end.toLocaleString()}
      </span>
    ),
  },
  {
    id: "anchor2",
    header: "Anchor 2",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-foreground">
        {row.original.anchor2_start.toLocaleString()}&ndash;
        {row.original.anchor2_end.toLocaleString()}
      </span>
    ),
  },
  {
    id: "loop_span",
    accessorKey: "loop_span",
    header: "Span",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {(getValue() as number).toLocaleString()} bp
      </span>
    ),
  },
  {
    id: "assay_type",
    accessorKey: "assay_type",
    header: "Assay",
    enableSorting: false,
    cell: ({ getValue }) => {
      const raw = getValue() as string;
      const assays = raw.split(",");
      if (assays.length === 1) {
        return <span className="text-xs text-muted-foreground">{raw}</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {assays.map((a) => (
            <span
              key={a}
              className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {a.trim()}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(
  tissues: string[],
  assays: string[],
  tissueGroups: string[],
): ServerFilterConfig[] {
  return [
    tissueGroupFilter(tissueGroups),
    tissueFilter(tissues),
    {
      id: "assay",
      label: "Assay",
      type: "select",
      placeholder: "All assays",
      options: assays.map((a) => ({ value: a, label: a })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const LOOPS_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Max Span",
  metricDescription: "Longest chromatin loop span (bp) in this tissue group",
  countLabel: "Loops",
  formatMetric: (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mb`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)} kb`;
    return `${v} bp`;
  },
  showTopItem: true,
  topItemLabel: "Top Assay",
};

interface LoopsViewProps {
  loc: string;
  tissues: string[];
  assays: string[];
  totalCount: number;
  regionCoords: string;
  initialData?: PaginatedResponse<LoopRow>;
  summary?: RegionSummary | null;
  basePath?: string;
  groupedData?: TissueGroupRow[];
}

export function LoopsView({
  loc,
  tissues,
  assays,
  totalCount,
  regionCoords,
  initialData,
  summary,
  basePath,
  groupedData,
}: LoopsViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={LOOPS_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total loops`}
      />
    );
  }

  return (
    <LoopsDetailView
      loc={loc}
      tissues={tissues}
      assays={assays}
      totalCount={totalCount}
      regionCoords={regionCoords}
      initialData={initialData}
      summary={summary}
      basePath={basePath}
    />
  );
}

function LoopsDetailView({
  loc,
  tissues,
  assays,
  totalCount,
  regionCoords,
  initialData,
  summary: _summary,
  basePath: _basePath,
}: Omit<LoopsViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useLoopsQuery({
    loc,
    initialData,
  });

  const tissueGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const row of data) {
      if (row.tissue_group) groups.add(row.tissue_group);
    }
    return [...groups].sort();
  }, [data]);

  const filters = useMemo(
    () => buildFilters(tissues, assays, tissueGroups),
    [tissues, assays, tissueGroups],
  );

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") ||
      searchParams.get("tissue_group") ||
      searchParams.get("assay"),
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

  // When filters active, show filtered data in arc diagram; otherwise use initialData (more rows)
  const arcRows = hasActiveFilters ? data : (initialData?.data ?? data);

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} loops across ${tissues.length} biosamples`
      : `Loops across ${tissues.length} biosamples`;

  return (
    <div className="space-y-6">
      <TissueGroupBackButton />

      {regionStart > 0 && (
        <LoopArcDiagram
          rows={arcRows}
          regionStart={regionStart}
          regionEnd={regionEnd}
          tissues={tissues}
        />
      )}

      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search tissues, assays..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`loops-${loc}`}
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
        emptyMessage="No chromatin loops found for this region"
      />
    </div>
  );
}
