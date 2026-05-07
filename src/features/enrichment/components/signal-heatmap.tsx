"use client";

import type { SignalRow } from "@features/enrichment/api/region";
import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { useClientSearchParams } from "@shared/hooks";
import { inferTissueGroup } from "@shared/utils/tissue-format";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Marks config
// ---------------------------------------------------------------------------

const MARKS = [
  {
    key: "max_signal" as const,
    label: "Max Z",
    short: "Max",
    color: "#8b5cf6",
    tw: "bg-primary",
  },
  {
    key: "dnase" as const,
    label: "DNase Z",
    short: "DNase",
    color: "#3b82f6",
    tw: "bg-blue-500",
  },
  {
    key: "atac" as const,
    label: "ATAC Z",
    short: "ATAC",
    color: "#10b981",
    tw: "bg-emerald-500",
  },
  {
    key: "ctcf" as const,
    label: "CTCF Z",
    short: "CTCF",
    color: "#f59e0b",
    tw: "bg-amber-500",
  },
  {
    key: "h3k27ac" as const,
    label: "H3K27ac Z",
    short: "H3K27ac",
    color: "#8b5cf6",
    tw: "bg-violet-500",
  },
  {
    key: "h3k4me3" as const,
    label: "H3K4me3 Z",
    short: "H3K4me3",
    color: "#f43f5e",
    tw: "bg-rose-500",
  },
] as const;

type MarkKey = (typeof MARKS)[number]["key"];

// ---------------------------------------------------------------------------
// Data fetching — single request via top_ccres param
// ---------------------------------------------------------------------------

async function fetchHeatmapData(loc: string): Promise<SignalRow[]> {
  const params = new URLSearchParams({ top_ccres: "25" });
  const res = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(loc)}/signals?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Pivot flat rows → matrix (aggregated by tissue_group, mean across biosamples)
// ---------------------------------------------------------------------------

const ASSAY_KEYS = ["dnase", "atac", "ctcf", "h3k27ac", "h3k4me3"] as const;
type AssayKey = (typeof ASSAY_KEYS)[number];

/**
 * One aggregated cell. Numeric fields are means across biosamples — `max`
 * saturated everything because at least one outlier biosample with high signal
 * exists in nearly every group, so means are what actually surface specificity.
 * `peak_signal` keeps the best single biosample for the tooltip context.
 */
interface AggCell {
  ccre_id: string;
  tissue_group: string;
  /** Mean of per-biosample max_signal */
  max_signal: number;
  /** Mean of per-biosample mark Z-scores (null if no biosample in this group reports the mark) */
  dnase: number | null;
  atac: number | null;
  ctcf: number | null;
  h3k27ac: number | null;
  h3k4me3: number | null;
  /** Highest single-biosample max_signal observed in this group */
  peak_signal: number;
  /** Distinct biosample count in this group at this cCRE */
  biosample_count: number;
  /** Biosample whose max_signal equalled peak_signal */
  top_biosample: string | null;
  ccre_classification: string;
}

/** Per-(cCRE, mark) mean and std across tissue groups — for column z-score. */
interface ColStat {
  mean: number;
  std: number;
}

interface HeatmapMatrix {
  ccreIds: string[];
  tissueGroups: string[];
  cells: Map<string, AggCell>;
  /** key = `${ccre_id}|${markKey}` */
  colStats: Map<string, ColStat>;
}

function rowGroup(row: SignalRow): string {
  return row.tissue_group?.trim() || inferTissueGroup(row.tissue_name);
}

interface MarkAcc {
  sum: number;
  count: number;
}

interface CellAcc {
  signalSum: number;
  signalCount: number;
  peak: number;
  topBiosample: string | null;
  classification: string;
  biosamples: Set<string>;
  marks: Record<AssayKey, MarkAcc>;
}

function newCellAcc(): CellAcc {
  return {
    signalSum: 0,
    signalCount: 0,
    peak: 0,
    topBiosample: null,
    classification: "",
    biosamples: new Set(),
    marks: {
      dnase: { sum: 0, count: 0 },
      atac: { sum: 0, count: 0 },
      ctcf: { sum: 0, count: 0 },
      h3k27ac: { sum: 0, count: 0 },
      h3k4me3: { sum: 0, count: 0 },
    },
  };
}

function pivotToMatrix(rows: SignalRow[]): HeatmapMatrix {
  const ccreOrder: string[] = [];
  const ccreSet = new Set<string>();
  const groupSet = new Set<string>();
  const accs = new Map<string, CellAcc>();

  for (const row of rows) {
    if (!ccreSet.has(row.ccre_id)) {
      ccreSet.add(row.ccre_id);
      ccreOrder.push(row.ccre_id);
    }
    const group = rowGroup(row);
    groupSet.add(group);

    const key = `${row.ccre_id}|${group}`;
    let acc = accs.get(key);
    if (!acc) {
      acc = newCellAcc();
      accs.set(key, acc);
    }

    const biosample = row.subtissue_name ?? row.tissue_name;
    acc.biosamples.add(biosample);

    if (row.max_signal != null) {
      acc.signalSum += row.max_signal;
      acc.signalCount += 1;
      if (row.max_signal > acc.peak) {
        acc.peak = row.max_signal;
        acc.topBiosample = biosample;
        if (row.ccre_classification)
          acc.classification = row.ccre_classification;
      }
    }

    for (const mark of ASSAY_KEYS) {
      const v = row[mark];
      if (v != null) {
        acc.marks[mark].sum += v;
        acc.marks[mark].count += 1;
      }
    }
  }

  const cells = new Map<string, AggCell>();
  for (const [key, acc] of accs) {
    const sep = key.indexOf("|");
    const ccre_id = key.slice(0, sep);
    const tissue_group = key.slice(sep + 1);
    const meanOf = (m: MarkAcc) => (m.count > 0 ? m.sum / m.count : null);
    cells.set(key, {
      ccre_id,
      tissue_group,
      max_signal: acc.signalCount > 0 ? acc.signalSum / acc.signalCount : 0,
      dnase: meanOf(acc.marks.dnase),
      atac: meanOf(acc.marks.atac),
      ctcf: meanOf(acc.marks.ctcf),
      h3k27ac: meanOf(acc.marks.h3k27ac),
      h3k4me3: meanOf(acc.marks.h3k4me3),
      peak_signal: acc.peak,
      biosample_count: acc.biosamples.size,
      top_biosample: acc.topBiosample,
      ccre_classification: acc.classification,
    });
  }

  // Per-column stats (one (mean, std) per cCRE × mark) for z-score coloring.
  const allMarks: MarkKey[] = ["max_signal", ...ASSAY_KEYS];
  const colStats = new Map<string, ColStat>();
  for (const ccre_id of ccreOrder) {
    for (const mark of allMarks) {
      const vals: number[] = [];
      for (const group of groupSet) {
        const c = cells.get(`${ccre_id}|${group}`);
        if (!c) continue;
        const v = mark === "max_signal" ? c.max_signal : c[mark];
        if (v != null) vals.push(v);
      }
      if (vals.length === 0) {
        colStats.set(`${ccre_id}|${mark}`, { mean: 0, std: 0 });
        continue;
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance =
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      colStats.set(`${ccre_id}|${mark}`, {
        mean,
        std: Math.sqrt(variance),
      });
    }
  }

  // Sort groups by mean column z-score across all cCREs (most consistently
  // above-average groups first). Falls back to mean signal when std is 0.
  const groupScore = new Map<string, { sum: number; n: number }>();
  for (const ccre_id of ccreOrder) {
    const stat = colStats.get(`${ccre_id}|max_signal`);
    if (!stat) continue;
    for (const group of groupSet) {
      const c = cells.get(`${ccre_id}|${group}`);
      if (!c) continue;
      const score =
        stat.std > 0 ? (c.max_signal - stat.mean) / stat.std : c.max_signal;
      const t = groupScore.get(group) ?? { sum: 0, n: 0 };
      t.sum += score;
      t.n += 1;
      groupScore.set(group, t);
    }
  }
  const tissueGroups = [...groupSet].sort((a, b) => {
    const ta = groupScore.get(a);
    const tb = groupScore.get(b);
    const sa = ta && ta.n > 0 ? ta.sum / ta.n : 0;
    const sb = tb && tb.n > 0 ? tb.sum / tb.n : 0;
    return sb - sa;
  });

  return { ccreIds: ccreOrder, tissueGroups, cells, colStats };
}

// ---------------------------------------------------------------------------
// Color scale — column z-score (per-cCRE normalization)
// ---------------------------------------------------------------------------

/**
 * Map a column z-score to opacity. Centered: z=0 → mid (0.4), capped at ±2σ.
 * One-sided emphasis (above-average groups stand out more than below-average
 * fade further) since the eye is hunting for "where is this cCRE active?".
 */
function zOpacity(z: number): number {
  const clamped = Math.max(-2, Math.min(2, z));
  if (clamped >= 0) return 0.4 + (clamped / 2) * 0.55; // 0.4 → 0.95
  return 0.4 + (clamped / 2) * 0.35; // 0.4 → 0.05
}

function cellZ(cell: AggCell, mark: MarkKey, stat: ColStat | undefined) {
  const v = mark === "max_signal" ? cell.max_signal : cell[mark];
  if (v == null || !stat) return null;
  if (stat.std === 0) return 0;
  return (v - stat.mean) / stat.std;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

const ASSAY_MARKS = MARKS.filter((m) => m.key !== "max_signal");

function CellTooltip({ cell, z }: { cell: AggCell; z: number | null }) {
  const absValues = ASSAY_MARKS.map((m) =>
    Math.abs((cell[m.key as AssayKey] as number | null) ?? 0),
  );
  const maxAbs = Math.max(...absValues, 0.01);

  return (
    <div className="space-y-1">
      <p className="font-medium font-mono">{cell.ccre_id}</p>
      <p>{cell.tissue_group}</p>
      <p className="opacity-60 text-[11px]">
        Mean across {cell.biosample_count}{" "}
        {cell.biosample_count === 1 ? "biosample" : "biosamples"}
      </p>
      {cell.top_biosample && (
        <p
          className="opacity-60 text-[11px] truncate max-w-[200px]"
          title={cell.top_biosample}
        >
          Peak: {cell.top_biosample} ({cell.peak_signal.toFixed(2)})
        </p>
      )}
      <div className="space-y-0.5 pt-1">
        {ASSAY_MARKS.map((m) => {
          const v = cell[m.key as AssayKey] as number | null;
          const pct = v != null ? (Math.abs(v) / maxAbs) * 100 : 0;
          return (
            <div key={m.key} className="flex items-center gap-2">
              <span
                className="w-14 text-[11px] font-medium"
                style={{ color: m.color }}
              >
                {m.short}
              </span>
              <div
                className="flex-1 h-2 rounded-sm overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
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
        <span className="tabular-nums">
          mean {cell.max_signal.toFixed(2)}
          {z != null && ` \u00b7 ${z >= 0 ? "+" : ""}${z.toFixed(1)}\u03c3`}
        </span>
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
// Tissue group click → URL filter (shared by heatmap + bar views)
// ---------------------------------------------------------------------------

function useTissueGroupFilter() {
  const searchParams = useClientSearchParams();
  const selectedGroup = searchParams.get("tissue_group");

  const setGroup = useCallback((group: string) => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("tissue_group");
    if (current === group) {
      url.searchParams.delete("tissue_group");
    } else {
      url.searchParams.set("tissue_group", group);
    }
    url.searchParams.delete("tissue");
    url.searchParams.delete("cursor");
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("urlchange"));
  }, []);

  return { selectedGroup, setGroup };
}

// ---------------------------------------------------------------------------
// Reusable cell value extraction
// ---------------------------------------------------------------------------

function cellValue(cell: AggCell, mark: MarkKey): number | null {
  return mark === "max_signal" ? cell.max_signal : cell[mark];
}

function markColor(mark: MarkKey): string {
  return MARKS.find((m) => m.key === mark)?.color ?? "#8b5cf6";
}

// ---------------------------------------------------------------------------
// Card chrome — header + mark selector, shared by both views
// ---------------------------------------------------------------------------

function HeatmapCard({
  subtitle,
  activeMark,
  onMarkChange,
  children,
  footer,
}: {
  subtitle: string;
  activeMark: MarkKey;
  onMarkChange: (mark: MarkKey) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              cCRE Activity Heatmap
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <MarkSelector activeMark={activeMark} onMarkChange={onMarkChange} />
        </div>
        {children}
        {footer}
      </div>
    </TooltipProvider>
  );
}

function ClearGroupChip({
  group,
  onClear,
}: {
  group: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="ml-auto text-primary hover:underline text-xs"
    >
      Clear: {group}
    </button>
  );
}

const Z_LEGEND_STOPS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2] as const;

// ---------------------------------------------------------------------------
// Heatmap view (≥3 cCREs)
// ---------------------------------------------------------------------------

interface HeatmapViewProps {
  matrix: HeatmapMatrix;
  activeMark: MarkKey;
  onMarkChange: (mark: MarkKey) => void;
}

function HeatmapView({ matrix, activeMark, onMarkChange }: HeatmapViewProps) {
  const { selectedGroup, setGroup } = useTissueGroupFilter();
  const color = markColor(activeMark);

  return (
    <HeatmapCard
      subtitle={`Top ${matrix.ccreIds.length} cCREs × ${matrix.tissueGroups.length} tissue groups · cells colored by per-cCRE z-score`}
      activeMark={activeMark}
      onMarkChange={onMarkChange}
      footer={
        <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">−2σ</span>
          <div className="flex items-center h-3">
            {Z_LEGEND_STOPS.map((z, i) => (
              <div
                key={z}
                className={cn(
                  "w-5 h-3",
                  i === 0 && "rounded-l-sm",
                  i === Z_LEGEND_STOPS.length - 1 && "rounded-r-sm",
                )}
                style={{ backgroundColor: color, opacity: zOpacity(z) }}
              />
            ))}
          </div>
          <span className="tabular-nums">+2σ</span>
          <span className="opacity-70">
            — per-cCRE z-score across tissue groups
          </span>
          {selectedGroup && (
            <ClearGroupChip
              group={selectedGroup}
              onClear={() => setGroup(selectedGroup)}
            />
          )}
        </div>
      }
    >
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
                    className="absolute bottom-1 left-1/2 origin-bottom-left text-xs font-mono font-normal text-muted-foreground whitespace-nowrap"
                    style={{ transform: "rotate(-55deg)" }}
                  >
                    {ccreId}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.tissueGroups.map((group) => {
              const isSelected = selectedGroup === group;
              return (
                <tr
                  key={group}
                  className={cn(
                    "group/row border-t border-border/20",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <td className="px-3 py-0">
                    <button
                      type="button"
                      onClick={() => setGroup(group)}
                      className={cn(
                        "w-full text-left py-1 transition-colors",
                        isSelected
                          ? "text-foreground font-medium"
                          : "text-muted-foreground group-hover/row:text-foreground",
                      )}
                    >
                      <span className="text-[11px] truncate block max-w-40">
                        {group}
                      </span>
                    </button>
                  </td>

                  {matrix.ccreIds.map((ccreId) => {
                    const cell = matrix.cells.get(`${ccreId}|${group}`);
                    const stat = matrix.colStats.get(`${ccreId}|${activeMark}`);
                    const z = cell ? cellZ(cell, activeMark, stat) : null;

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
                                backgroundColor:
                                  z != null ? color : "var(--muted)",
                                opacity: z != null ? zOpacity(z) : 0.15,
                              }}
                            />
                          </TooltipTrigger>
                          {cell && (
                            <TooltipContent
                              side="right"
                              className="w-56"
                              sideOffset={8}
                            >
                              <CellTooltip cell={cell} z={z} />
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HeatmapCard>
  );
}

// ---------------------------------------------------------------------------
// Bar chart view (≤2 cCREs) — a heatmap of one column is just a worse bar chart
// ---------------------------------------------------------------------------

function BarChartView({ matrix, activeMark, onMarkChange }: HeatmapViewProps) {
  const { selectedGroup, setGroup } = useTissueGroupFilter();
  const color = markColor(activeMark);

  // Order groups by activeMark value at the first cCRE (descending). When
  // there are 2 cCREs, sort by sum across both — keeps the visual stable.
  const sortedGroups = useMemo(() => {
    return [...matrix.tissueGroups].sort((a, b) => {
      const sumFor = (g: string) =>
        matrix.ccreIds.reduce((acc, ccreId) => {
          const c = matrix.cells.get(`${ccreId}|${g}`);
          return acc + (c ? (cellValue(c, activeMark) ?? 0) : 0);
        }, 0);
      return sumFor(b) - sumFor(a);
    });
  }, [matrix, activeMark]);

  // Find max value across all cells for bar scaling.
  const scaleMax = useMemo(() => {
    let m = 0;
    for (const cell of matrix.cells.values()) {
      const v = cellValue(cell, activeMark);
      if (v != null && v > m) m = v;
    }
    return m || 1;
  }, [matrix, activeMark]);

  const subtitle =
    matrix.ccreIds.length === 1
      ? `${matrix.ccreIds[0]} · mean Z across biosamples in each tissue group`
      : `${matrix.ccreIds.length} cCREs · mean Z across biosamples in each tissue group`;

  return (
    <HeatmapCard
      subtitle={subtitle}
      activeMark={activeMark}
      onMarkChange={onMarkChange}
      footer={
        selectedGroup ? (
          <div className="px-4 py-2 border-t border-border flex items-center">
            <ClearGroupChip
              group={selectedGroup}
              onClear={() => setGroup(selectedGroup)}
            />
          </div>
        ) : null
      }
    >
      <div className="px-4 py-3 space-y-3">
        {matrix.ccreIds.map((ccreId, idx) => (
          <div
            key={ccreId}
            className={idx > 0 ? "pt-3 border-t border-border/40" : ""}
          >
            {matrix.ccreIds.length > 1 && (
              <div className="text-xs font-mono text-muted-foreground mb-2">
                {ccreId}
              </div>
            )}
            <div className="space-y-1">
              {sortedGroups.map((group) => {
                const cell = matrix.cells.get(`${ccreId}|${group}`);
                const value = cell ? cellValue(cell, activeMark) : null;
                const stat = matrix.colStats.get(`${ccreId}|${activeMark}`);
                const z = cell ? cellZ(cell, activeMark, stat) : null;
                const pct = value != null ? (value / scaleMax) * 100 : 0;
                const isSelected = selectedGroup === group;

                return (
                  <div
                    key={group}
                    className={cn(
                      "flex items-center gap-2 group/bar rounded px-1 -mx-1 transition-colors",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setGroup(group)}
                      className={cn(
                        "w-28 shrink-0 text-left text-[11px] truncate transition-colors",
                        isSelected
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {group}
                    </button>
                    <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden relative">
                      {value != null && value > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="h-full rounded-sm"
                              style={{
                                width: `${Math.max(pct, 1)}%`,
                                backgroundColor: color,
                                opacity: 0.85,
                              }}
                            />
                          </TooltipTrigger>
                          {cell && (
                            <TooltipContent
                              side="right"
                              className="w-56"
                              sideOffset={8}
                            >
                              <CellTooltip cell={cell} z={z} />
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </div>
                    <span className="w-12 text-right tabular-nums text-[11px] text-muted-foreground shrink-0">
                      {value != null ? value.toFixed(2) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </HeatmapCard>
  );
}

// ---------------------------------------------------------------------------
// Main — dispatches to heatmap or bar chart based on cCRE count
// ---------------------------------------------------------------------------

interface SignalHeatmapProps {
  loc: string;
}

const BAR_CHART_THRESHOLD = 2;

export function SignalHeatmap({ loc }: SignalHeatmapProps) {
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

  const View =
    matrix.ccreIds.length <= BAR_CHART_THRESHOLD ? BarChartView : HeatmapView;

  return (
    <View
      matrix={matrix}
      activeMark={activeMark}
      onMarkChange={setActiveMark}
    />
  );
}
