"use client";

import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { SignalRow } from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Marks config
// ---------------------------------------------------------------------------

const MARKS = [
  { key: "max_signal" as const, label: "Max Z", short: "Max", color: "#8b5cf6", tw: "bg-primary" },
  { key: "dnase" as const, label: "DNase Z", short: "DNase", color: "#3b82f6", tw: "bg-blue-500" },
  { key: "atac" as const, label: "ATAC Z", short: "ATAC", color: "#10b981", tw: "bg-emerald-500" },
  { key: "ctcf" as const, label: "CTCF Z", short: "CTCF", color: "#f59e0b", tw: "bg-amber-500" },
  { key: "h3k27ac" as const, label: "H3K27ac Z", short: "H3K27ac", color: "#8b5cf6", tw: "bg-violet-500" },
  { key: "h3k4me3" as const, label: "H3K4me3 Z", short: "H3K4me3", color: "#f43f5e", tw: "bg-rose-500" },
] as const;

type MarkKey = (typeof MARKS)[number]["key"];

// ---------------------------------------------------------------------------
// Data fetching — single request via top_ccres param
// ---------------------------------------------------------------------------

async function fetchHeatmapData(loc: string): Promise<SignalRow[]> {
  const params = new URLSearchParams({ top_ccres: "25" });
  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/signals?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Pivot flat rows → matrix
// ---------------------------------------------------------------------------

interface HeatmapMatrix {
  ccreIds: string[];
  tissues: string[];
  cells: Map<string, SignalRow>;
  maxSignal: number;
  p95: number;
  /** Per-mark p95 for mark-specific color scaling */
  markP95: Record<string, number>;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function pivotToMatrix(rows: SignalRow[]): HeatmapMatrix {
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

  // Sort tissues by total signal (most active first)
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

  // Compute p95 for max_signal and each individual mark
  const computeP95 = (vals: number[]) => {
    const sorted = vals.filter((v) => v > 0).sort((a, b) => a - b);
    return sorted.length > 0 ? quantile(sorted, 0.95) : 0;
  };

  const p95 = computeP95(rows.map((r) => r.max_signal));

  const markP95: Record<string, number> = { max_signal: p95 };
  for (const mark of ["dnase", "atac", "ctcf", "h3k27ac", "h3k4me3"]) {
    markP95[mark] = computeP95(
      rows.map((r) => (r[mark as keyof SignalRow] as number) ?? 0),
    );
  }

  return { ccreIds: ccreOrder, tissues, cells, maxSignal, p95, markP95 };
}

// ---------------------------------------------------------------------------
// Color scale — sqrt-compressed, returns inline style for per-mark coloring
// ---------------------------------------------------------------------------

function signalOpacity(value: number, p95: number): number {
  if (p95 === 0 || value <= 0) return 0.03;
  const clamped = Math.min(value, p95);
  const r = Math.sqrt(clamped / p95);
  // Map to 0.05–0.9 opacity range
  return 0.05 + r * 0.85;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

const ASSAY_MARKS = MARKS.filter((m) => m.key !== "max_signal");

function CellTooltip({ cell }: { cell: SignalRow }) {
  const absValues = ASSAY_MARKS.map((m) =>
    Math.abs((cell[m.key as keyof SignalRow] as number) ?? 0),
  );
  const maxAbs = Math.max(...absValues, 0.01);

  return (
    <div className="space-y-1">
      <p className="font-medium font-mono">{cell.ccre_id}</p>
      <p>{cell.tissue_name}</p>
      {cell.subtissue_name && (
        <p className="opacity-60 text-[11px]">{cell.subtissue_name}</p>
      )}
      <div className="space-y-0.5 pt-1">
        {ASSAY_MARKS.map((m) => {
          const v = cell[m.key as keyof SignalRow] as number | null;
          const pct = v != null ? (Math.abs(v) / maxAbs) * 100 : 0;
          return (
            <div key={m.key} className="flex items-center gap-2">
              <span
                className="w-14 text-[11px] font-medium"
                style={{ color: m.color }}
              >
                {m.short}
              </span>
              <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                {v != null && (
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: m.color,
                    }}
                  />
                )}
              </div>
              <span className="w-10 text-right tabular-nums text-[11px]">
                {v != null ? v.toFixed(2) : "\u2014"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between opacity-60 pt-1 border-t border-current/20 text-[11px]">
        <span>{cell.ccre_classification || "\u2014"}</span>
        <span className="tabular-nums">max {cell.max_signal?.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mark selector — segmented control to choose which assay colors the heatmap
// ---------------------------------------------------------------------------

function MarkSelector({
  activeMark,
  onMarkChange,
}: {
  activeMark: MarkKey;
  onMarkChange: (mark: MarkKey) => void;
}) {
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
      {MARKS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onMarkChange(m.key)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
            m.key === activeMark
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: m.color }}
          />
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface SignalHeatmapProps {
  loc: string;
}

export function SignalHeatmap({ loc }: SignalHeatmapProps) {
  const searchParams = useClientSearchParams();
  const [activeMark, setActiveMark] = useState<MarkKey>("max_signal");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["heatmap", loc],
    queryFn: () => fetchHeatmapData(loc),
    staleTime: 5 * 60 * 1000,
  });

  const matrix = useMemo(
    () => (rows?.length ? pivotToMatrix(rows) : null),
    [rows],
  );

  const activeColor = MARKS.find((m) => m.key === activeMark)?.color ?? "#8b5cf6";
  const activeP95 = matrix?.markP95[activeMark] ?? matrix?.p95 ?? 1;

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
    <TooltipProvider delayDuration={100}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              cCRE Signal Z-scores
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top {matrix.ccreIds.length} cCREs &times; {matrix.tissues.length}{" "}
              biosamples. Values are Z-scores across all ENCODE biosamples.
            </p>
          </div>
          <MarkSelector activeMark={activeMark} onMarkChange={setActiveMark} />
        </div>

        {/* Heatmap grid */}
        <div className="overflow-auto">
          <table className="w-full border-collapse">
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

                  {matrix.ccreIds.map((ccreId) => {
                    const cell = matrix.cells.get(`${ccreId}|${tissue}`);
                    const value = cell
                      ? ((cell[activeMark as keyof SignalRow] as number) ?? 0)
                      : 0;
                    const opacity = cell ? signalOpacity(value, activeP95) : 0;

                    return (
                      <td key={ccreId} className="px-0.5 py-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "mx-auto rounded-[3px] transition-all cursor-pointer",
                                "hover:ring-2 hover:ring-foreground/20",
                              )}
                              style={{
                                width: 32,
                                height: 24,
                                backgroundColor: cell
                                  ? activeColor
                                  : "var(--muted)",
                                opacity: cell ? opacity : 0.15,
                              }}
                            />
                          </TooltipTrigger>
                          {cell && (
                            <TooltipContent
                              side="right"
                              className="w-56"
                              sideOffset={8}
                            >
                              <CellTooltip cell={cell} />
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="tabular-nums">0</span>
          <div className="flex items-center h-3">
            {[0.05, 0.15, 0.25, 0.4, 0.55, 0.75, 0.9].map((op, i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-3",
                  i === 0 && "rounded-l-sm",
                  i === 6 && "rounded-r-sm",
                )}
                style={{ backgroundColor: activeColor, opacity: op }}
              />
            ))}
          </div>
          <span className="tabular-nums">{activeP95.toFixed(1)}+</span>
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
    </TooltipProvider>
  );
}
