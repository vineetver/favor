"use client";

import { cn } from "@infra/utils";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { SignalRow } from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Marks config
// ---------------------------------------------------------------------------

const MARKS = [
  { key: "dnase" as const, label: "DNase", color: "bg-blue-500" },
  { key: "atac" as const, label: "ATAC", color: "bg-emerald-500" },
  { key: "ctcf" as const, label: "CTCF", color: "bg-amber-500" },
  { key: "h3k27ac" as const, label: "H3K27ac", color: "bg-violet-500" },
  { key: "h3k4me3" as const, label: "H3K4me3", color: "bg-rose-500" },
];

type MarkKey = "dnase" | "atac" | "ctcf" | "h3k27ac" | "h3k4me3";

// ---------------------------------------------------------------------------
// Data fetching — single request via top_ccres param
// ---------------------------------------------------------------------------

async function fetchHeatmapData(
  loc: string,
  filters: Record<string, string>,
): Promise<SignalRow[]> {
  const params = new URLSearchParams(filters);
  params.set("top_ccres", "25");

  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/signals?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Pivot flat rows → matrix. Server already sorted by peak signal desc,
// so cCRE order from grouping preserves that ranking.
// Rows = tissues, Columns = cCREs.
// ---------------------------------------------------------------------------

interface HeatmapMatrix {
  ccreIds: string[];
  tissues: string[];
  cells: Map<string, SignalRow>;
  maxSignal: number;
  /** 95th percentile of non-zero signal values — used as color domain ceiling */
  p95: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function pivotToMatrix(rows: SignalRow[]): HeatmapMatrix {
  // Preserve server-side cCRE order (peak signal desc)
  const ccreOrder: string[] = [];
  const ccreSet = new Set<string>();
  const tissueSet = new Set<string>();
  const cells = new Map<string, SignalRow>();
  let maxSignal = 0;

  for (const row of rows) {
    if (!ccreSet.has(row.ccre_id)) {
      ccreSet.add(row.ccre_id);
      ccreOrder.push(row.ccre_id);
    }
    tissueSet.add(row.tissue_name);
    cells.set(`${row.ccre_id}|${row.tissue_name}`, row);
    if (row.max_signal > maxSignal) maxSignal = row.max_signal;
  }

  // Sort tissues by total signal across all cCREs (most active first)
  const tissueTotal = new Map<string, number>();
  for (const row of rows) {
    tissueTotal.set(
      row.tissue_name,
      (tissueTotal.get(row.tissue_name) ?? 0) + row.max_signal,
    );
  }
  const tissues = [...tissueSet].sort(
    (a, b) => (tissueTotal.get(b) ?? 0) - (tissueTotal.get(a) ?? 0),
  );

  // Compute p95 from non-zero signal values for color scaling
  const nonZero = rows
    .map((r) => r.max_signal)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const p95 = nonZero.length > 0 ? quantile(nonZero, 0.95) : maxSignal;

  return { ccreIds: ccreOrder, tissues, cells, maxSignal, p95 };
}

// ---------------------------------------------------------------------------
// Color scale — sqrt on p95-clamped domain to spread the skewed low end
// ---------------------------------------------------------------------------

function signalColor(value: number, p95: number): string {
  if (p95 === 0) return "bg-muted/30";
  // Clamp at p95 so the top 5% saturates
  const clamped = Math.min(value, p95);
  // Sqrt to spread out the low end of the right-skewed distribution
  const r = Math.sqrt(clamped / p95);
  if (r < 0.15) return "bg-primary/5";
  if (r < 0.3) return "bg-primary/15";
  if (r < 0.45) return "bg-primary/25";
  if (r < 0.6) return "bg-primary/40";
  if (r < 0.75) return "bg-primary/55";
  if (r < 0.9) return "bg-primary/75";
  return "bg-primary/90";
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function CellTooltip({ cell }: { cell: SignalRow }) {
  // Compute the max absolute value across all marks for this cell to scale bars
  const absValues = MARKS.map((m) => Math.abs(cell[m.key as MarkKey] ?? 0));
  const maxAbs = Math.max(...absValues, 0.01);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-foreground">{cell.ccre_id}</p>
        <p className="text-[10px] text-muted-foreground">{cell.tissue_name}</p>
      </div>
      <div className="space-y-1">
        {MARKS.map((m) => {
          const v = cell[m.key as MarkKey];
          // Scale relative to the largest absolute value in this cell
          const pct = v != null ? (Math.abs(v) / maxAbs) * 100 : 0;
          const isNeg = v != null && v < 0;
          return (
            <div key={m.key} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-muted-foreground">{m.label}</span>
              <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                {v != null && (
                  <div
                    className={cn(
                      "h-full rounded-sm",
                      isNeg ? "bg-muted-foreground/30" : m.color,
                    )}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                )}
              </div>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {v != null ? v.toFixed(1) : "\u2014"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
        <span>Class: {cell.ccre_classification || "\u2014"}</span>
        <span>Max: {cell.max_signal?.toFixed(2) ?? "\u2014"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main — transposed: rows = tissues, columns = cCREs (by peak signal)
// ---------------------------------------------------------------------------

interface SignalHeatmapProps {
  loc: string;
}

export function SignalHeatmap({ loc }: SignalHeatmapProps) {
  const searchParams = useClientSearchParams();
  const [tooltip, setTooltip] = useState<{
    cell: SignalRow;
    x: number;
    y: number;
  } | null>(null);

  // Heatmap fetches independently — table filters (tissue, ccre_class) do NOT affect it.
  // This prevents refetching the heatmap every time the user filters the table.
  const { data: rows, isLoading } = useQuery({
    queryKey: ["heatmap", loc],
    queryFn: () => fetchHeatmapData(loc, {}),
    staleTime: 5 * 60 * 1000,
  });

  const matrix = useMemo(
    () => (rows?.length ? pivotToMatrix(rows) : null),
    [rows],
  );

  const handleTissueClick = useCallback((tissue: string) => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("tissue");
    if (current === tissue) {
      url.searchParams.delete("tissue");
    } else {
      url.searchParams.set("tissue", tissue);
    }
    url.searchParams.delete("cursor");
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("urlchange"));
  }, []);

  const handleCellHover = useCallback(
    (e: React.MouseEvent, ccreId: string, tissue: string) => {
      if (!matrix) return;
      const cell = matrix.cells.get(`${ccreId}|${tissue}`);
      if (!cell) {
        setTooltip(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const x = spaceRight > 240 ? rect.right + 8 : rect.left - 232;
      const y = Math.min(rect.top, window.innerHeight - 260);
      setTooltip({ cell, x, y });
    },
    [matrix],
  );

  const selectedTissue = searchParams.get("tissue");

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-8">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-48 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  if (!matrix || matrix.ccreIds.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Signal Heatmap</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top {matrix.ccreIds.length} cCREs by peak signal &times;{" "}
          {matrix.tissues.length} tissues. Click a tissue to filter.
        </p>
      </div>

      {/* Transposed heatmap */}
      <div className="overflow-auto relative">
        <table className="w-full border-collapse">
          {/* Column headers — cCRE IDs (rotated) */}
          <thead>
            <tr>
              <th className="w-44 min-w-44 h-28" />
              {matrix.ccreIds.map((ccreId) => (
                <th
                  key={ccreId}
                  className="h-28 relative px-0"
                  style={{ width: 32 }}
                >
                  <span
                    className="absolute bottom-1 left-1/2 origin-bottom-left text-[10px] font-mono font-normal text-muted-foreground whitespace-nowrap"
                    style={{ transform: "rotate(-55deg)" }}
                  >
                    {ccreId}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.tissues.map((tissue) => (
              <tr
                key={tissue}
                className={cn(
                  "group/row border-t border-border/20",
                  selectedTissue === tissue && "bg-primary/5",
                )}
              >
                {/* Row label — tissue name */}
                <td className="px-3 py-0">
                  <button
                    onClick={() => handleTissueClick(tissue)}
                    className={cn(
                      "w-full text-left py-1 transition-colors",
                      selectedTissue === tissue
                        ? "text-foreground font-medium"
                        : "text-muted-foreground group-hover/row:text-foreground",
                    )}
                  >
                    <span className="text-[11px] truncate block max-w-40">
                      {tissue}
                    </span>
                  </button>
                </td>

                {/* Cells */}
                {matrix.ccreIds.map((ccreId) => {
                  const cell = matrix.cells.get(`${ccreId}|${tissue}`);
                  return (
                    <td key={ccreId} className="px-0.5 py-0.5">
                      <div
                        className={cn(
                          "mx-auto rounded-[3px] transition-all cursor-pointer",
                          cell
                            ? signalColor(cell.max_signal, matrix.p95)
                            : "bg-muted/20",
                          "hover:ring-2 hover:ring-primary/50",
                        )}
                        style={{ width: 32, height: 24 }}
                        onMouseEnter={(e) =>
                          handleCellHover(e, ccreId, tissue)
                        }
                        onMouseLeave={() => setTooltip(null)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 w-56 p-3 bg-popover border border-border rounded-lg shadow-lg pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <CellTooltip cell={tooltip.cell} />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>0</span>
        <div className="flex items-center">
          <div className="w-5 h-3 rounded-l-sm bg-primary/5 border border-r-0 border-border" />
          <div className="w-5 h-3 bg-primary/15" />
          <div className="w-5 h-3 bg-primary/25" />
          <div className="w-5 h-3 bg-primary/40" />
          <div className="w-5 h-3 bg-primary/55" />
          <div className="w-5 h-3 bg-primary/75" />
          <div className="w-5 h-3 rounded-r-sm bg-primary/90" />
        </div>
        <span>{matrix.p95.toFixed(1)}+</span>
        {selectedTissue && (
          <button
            onClick={() => handleTissueClick(selectedTissue)}
            className="ml-auto text-primary hover:underline"
          >
            Clear: {selectedTissue}
          </button>
        )}
      </div>
    </div>
  );
}
