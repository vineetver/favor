"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  ForestPlot,
  type ForestPlotRow,
  ManhattanPlot,
  type ManhattanPoint,
  PLOTLY_AXIS,
  PLOTLY_CONFIG_STATIC,
  PLOTLY_FONT,
  Plot,
  PRCurve,
} from "@shared/components/ui/charts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCohortFiles } from "../api";
import { VariantDrawer } from "../components/variant-drawer";
import { useDuckDB } from "../hooks/use-duckdb";
import {
  type AfBoxplotRow,
  type CrossDatasetData,
  DATASET_DEFS,
  type DatasetId,
  type DatasetReport,
  type ForestRow,
  generateIgvfReport,
  IGVF_BASELINE,
  type IgvfReportData,
  type LogfcRow,
  type MiamiPoint,
  type SharedBeCrispri,
  type SummaryRow,
  type UpsetRow,
  type VariantFilter,
} from "../lib/igvf-queries";

// ============================================================================
// Enrichment labels — all tables loaded from backend
// ============================================================================

const ENRICHMENT_LABELS = [
  "peaks",
  "gwas_ukb_ldl",
  "gwas_topmed_ldl",
  "ase",
  "coloc",
  "finemapped_glgc",
  "base_editing",
  "chrombpnet_liver",
  "tland_liver",
  "cv2f",
  "ccre_overlap",
  "dhs_overlap_mgh",
  "dhs_overlap_unc",
  "finemapped_topmed",
  "finemapped_ukb",
  // new (post 2026-04-16 rework)
  "mpra_encode",
  "mpra_unc",
  "mpra_unc_oligos",
  "crispri_bean",
  // kept for cohorts processed before the rework (old schema)
  "mpra",
  "mpra_oligos",
] as const;

// ============================================================================
// Color palettes for Miami modes
// ============================================================================

const EXONIC_COLORS: Record<string, string> = {
  Missense: "#ef4444",
  Synonymous: "#3b82f6",
  pLoF: "#171717",
};
const CAGE_COLORS: Record<string, string> = {
  Promoter: "#f97316",
  Enhancer: "#06b6d4",
  Neither: "#a3a3a3",
};
const ENCODE_ELEMENT_COLORS: Record<string, string> = {
  PLS: "#ef4444",
  pELS: "#f97316",
  dELS: "#eab308",
  "CTCF-only": "#22c55e",
  "DNase-H3K4me3": "#3b82f6",
  None: "#a3a3a3",
};

// ============================================================================
// Helpers
// ============================================================================

/** Format a rate as %, showing enough decimals to avoid "0.0%" for small values */
function fmtPct(rate: number): string {
  const pct = rate * 100;
  if (pct === 0) return "0%";
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toExponential(1)}%`;
}

function assertNever(x: never): never {
  throw new Error(`Unexpected case: ${String(x)}`);
}

type SortDir = "asc" | "desc";

/** Local-state sortable table helper. Sorts numeric/string rows by a key. */
function useSortableRows<T>(
  rows: T[],
  defaultKey: keyof T,
  defaultDir: SortDir = "desc",
): {
  rows: T[];
  sortKey: keyof T;
  sortDir: SortDir;
  setSort: (key: keyof T) => void;
} {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return out;
  }, [rows, sortKey, sortDir]);
  const setSort = useCallback(
    (key: keyof T) => {
      if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );
  return { rows: sorted, sortKey, sortDir, setSort };
}

/** Clickable <th> that shows a caret when this column is the active sort key. */
function SortHeader<T>({
  col,
  label,
  align,
  sortKey,
  sortDir,
  onClick,
}: {
  col: keyof T;
  label: string;
  align?: "left" | "right";
  sortKey: keyof T;
  sortDir: SortDir;
  onClick: (col: keyof T) => void;
}) {
  const active = col === sortKey;
  return (
    <th
      className={cn(
        "py-2 px-2 text-muted-foreground font-medium",
        align === "left" ? "text-left" : "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
          align === "right" ? "flex-row-reverse" : "",
        )}
      >
        {label}
        <span aria-hidden className="text-[9px] leading-none">
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/** Short explanatory caption rendered beneath a chart. */
function PlotCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
      {children}
    </p>
  );
}

// ============================================================================
// Data transforms
// ============================================================================

function toForestData(rows: ForestRow[]): ForestPlotRow[] {
  // Filter out methods with 0 predictions (tp + fp = 0) — Haldane pseudocount creates artifact ORs
  return rows
    .filter((r) => r.tp + r.fp > 0)
    .map((r) => ({ label: r.method, estimate: r.or, lo: r.orLo, hi: r.orHi }));
}
function toLogfcForest(rows: LogfcRow[]): ForestPlotRow[] {
  return rows
    .filter((r) => r.n >= 1)
    .map((r) => ({
      label: `${r.method}${r.n < 3 ? ` (n=${r.n})` : ""}`,
      estimate: r.meanZ,
      lo: r.lo,
      hi: r.hi,
    }));
}
function toRecallForest(rows: ForestRow[]): ForestPlotRow[] {
  // Only show methods with at least 1 TP — 0/N recall is not informative
  return rows
    .filter((r) => r.tp > 0)
    .map((r) => ({
      label: `${r.method}  ${r.tp}/${r.tp + r.fn}`,
      estimate: r.recall,
      lo: r.recallLo,
      hi: r.recallHi,
    }));
}
function toPrecisionForest(rows: ForestRow[]): ForestPlotRow[] {
  return rows
    .filter((r) => r.tp > 0)
    .map((r) => ({
      label: `${r.method}  ${r.tp}/${r.tp + r.fp}`,
      estimate: r.precision,
      lo: r.precisionLo,
      hi: r.precisionHi,
    }));
}

type MiamiMode = "functional" | "exonic" | "cage" | "encode";

function toManhattan(points: MiamiPoint[], mode: MiamiMode): ManhattanPoint[] {
  let filtered = points.filter((pt) => pt.upper_neglog_p != null);
  if (mode === "exonic")
    filtered = filtered.filter(
      (pt) => pt.variant_category === "Coding" && pt.exonic_category,
    );
  if (mode === "cage" || mode === "encode")
    filtered = filtered.filter((pt) => pt.variant_category === "Noncoding");

  return filtered.map((pt) => {
    let color: string, group: string, symbol: string;
    switch (mode) {
      case "functional": {
        color = pt.predicted_functional ? "#eab308" : "#6b21a8";
        symbol =
          pt.encode_ccre === "Promoter"
            ? "square"
            : pt.encode_ccre === "Enhancer"
              ? "triangle-up"
              : "circle";
        const ccre = pt.encode_ccre === "None" ? "No cCRE" : pt.encode_ccre;
        group = `${ccre} · ${pt.predicted_functional ? "Func." : "Not func."}`;
        break;
      }
      case "exonic": {
        const cat = pt.exonic_category ?? "Unknown";
        color = EXONIC_COLORS[cat] ?? "#737373";
        group = cat;
        symbol =
          cat === "pLoF"
            ? "triangle-up"
            : cat === "Missense"
              ? "circle"
              : "square";
        break;
      }
      case "cage": {
        color = CAGE_COLORS[pt.cage_category] ?? "#a3a3a3";
        group = `CAGE ${pt.cage_category}`;
        symbol =
          pt.cage_category === "Promoter"
            ? "square"
            : pt.cage_category === "Enhancer"
              ? "triangle-up"
              : "circle";
        break;
      }
      case "encode": {
        color = ENCODE_ELEMENT_COLORS[pt.encode_element] ?? "#a3a3a3";
        group = pt.encode_element;
        symbol = "circle";
        break;
      }
      default:
        assertNever(mode);
    }
    return {
      chrom: pt.chrom,
      position: pt.position,
      value: pt.upper_neglog_p ?? 0,
      color,
      symbol,
      group,
      significant: pt.is_sig,
      hoverText: `chr${pt.chrom}:${pt.position.toLocaleString()}\np=${(10 ** -(pt.upper_neglog_p ?? 0)).toExponential(1)}`,
    };
  });
}

// ============================================================================
// Reusable UI components
// ============================================================================

function SectionTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

/** Clickable count — renders as a link if onClick + count > 0, else plain text */
function Clickable({
  value,
  label,
  sql,
  onClick,
  className,
}: {
  value: number;
  label: string;
  sql: string;
  onClick?: (f: VariantFilter) => void;
  className?: string;
}) {
  if (!onClick || value === 0)
    return <span className={className}>{value.toLocaleString()}</span>;
  return (
    <button
      type="button"
      onClick={() => onClick({ label, sql })}
      className={cn(
        "text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 cursor-pointer",
        className,
      )}
    >
      {value.toLocaleString()}
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === opt.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Maps SummaryRow column keys → SQL filter functions (given sig column) */
const COL_FILTER_SQL: Record<string, (sig: string) => string> = {
  total: () => "TRUE",
  expSig: (s) => s,
  predFunc: () => "pred_overall",
  predSig: (s) => `pred_overall AND ${s}`,
  apc: () => "pred_apc",
  macie: () => "pred_macie",
  chrombpnet: () => "pred_chrombpnet",
  clinvar: () => "pred_clinvar",
  liver_cv2f: () => "pred_liver_cv2f",
  cv2f: () => "pred_cv2f",
  liver_ase: () => "pred_liver_ase",
  ase: () => "pred_ase",
  tland: () => "pred_liver_tland",
};

// ============================================================================
// Summary Table
// ============================================================================

/** Map a SummaryRow column key → baseline rates key */
const COL_TO_BASELINE: Record<string, string> = {
  predFunc: "pred_overall",
  apc: "pred_apc",
  macie: "pred_macie",
  chrombpnet: "pred_chrombpnet",
  clinvar: "pred_clinvar",
  liver_cv2f: "pred_liver_cv2f",
  cv2f: "pred_cv2f",
  liver_ase: "pred_liver_ase",
  ase: "pred_ase",
  tland: "pred_liver_tland",
};

function SummaryTable({
  data,
  title,
  showBaseline,
  onFilterClick,
  filterCtx,
}: {
  data: SummaryRow[];
  title?: string;
  showBaseline?: boolean;
  onFilterClick?: (f: VariantFilter) => void;
  filterCtx?: { baseWhere: string; sigColumn: string; categoryColumn: string };
}) {
  if (data.length === 0) return null;
  const cols: Array<{ k: keyof SummaryRow; l: string; fmt?: "float" }> = [
    { k: "category", l: "" },
    { k: "total", l: "n" },
    { k: "expSig", l: "Exp.Sig" },
    { k: "predFunc", l: "Pred.Func" },
    { k: "predSig", l: "Pred+Sig" },
    { k: "apc", l: "aPC" },
    { k: "macie", l: "MACIE" },
    { k: "chrombpnet", l: "CBPNet" },
    { k: "clinvar", l: "ClinVar" },
    { k: "liver_cv2f", l: "lv cV2F" },
    { k: "cv2f", l: "cV2F" },
    { k: "liver_ase", l: "lv ASE" },
    { k: "ase", l: "ASE" },
    { k: "tland", l: "TLand" },
    { k: "meanDnase", l: "DNase̅", fmt: "float" },
    { k: "meanH3k27ac", l: "H3K27ac̅", fmt: "float" },
    { k: "meanH3k4me3", l: "H3K4me3̅", fmt: "float" },
  ];
  // Hide method columns that are all zero — they add noise. Show footnote.
  const methodKeys = [
    "apc",
    "macie",
    "chrombpnet",
    "clinvar",
    "liver_cv2f",
    "cv2f",
    "liver_ase",
    "ase",
    "tland",
  ];
  const zeroMethods = methodKeys.filter(
    (k) => !data.some((r) => (r[k as keyof SummaryRow] as number) > 0),
  );
  const activeCols =
    zeroMethods.length > 0
      ? cols.filter((c) => !zeroMethods.includes(c.k))
      : cols;
  const numKeys = activeCols.filter((c) => c.k !== "category");

  const totals = {
    ...data.reduce(
      (acc, r) => {
        for (const c of numKeys) {
          const k = c.k as keyof SummaryRow;
          if (c.fmt === "float") continue;
          (acc as Record<string, number>)[k as string] =
            ((acc as Record<string, number>)[k as string] ?? 0) +
            ((r[k] as number) ?? 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    ),
    category: "All",
  } as SummaryRow;
  for (const c of numKeys.filter((c) => c.fmt === "float")) {
    let sw = 0,
      sv = 0;
    for (const r of data) {
      const v = r[c.k as keyof SummaryRow] as number | null;
      if (v != null) {
        sw += r.total;
        sv += v * r.total;
      }
    }
    (totals as unknown as Record<string, number | null>)[c.k] =
      sw > 0 ? sv / sw : null;
  }

  const renderRow = (
    row: SummaryRow,
    className?: string,
    isTotals?: boolean,
  ) => (
    <tr
      key={row.category}
      className={cn("border-b border-border/50", className)}
    >
      <td className="py-1.5 px-2 text-foreground">{row.category}</td>
      {numKeys.map((col) => {
        const v = row[col.k as keyof SummaryRow];
        const display =
          col.fmt === "float"
            ? v != null
              ? (v as number).toFixed(1)
              : "—"
            : String(v ?? 0);
        const filterFn =
          onFilterClick && filterCtx && !col.fmt ? COL_FILTER_SQL[col.k] : null;
        const canClick = filterFn && typeof v === "number" && v > 0;
        return (
          <td
            key={col.k}
            className={cn(
              "py-1.5 px-2 text-right tabular-nums",
              v == null || v === 0
                ? "text-muted-foreground/30"
                : "text-foreground",
            )}
          >
            {canClick ? (
              <button
                type="button"
                onClick={() => {
                  if (!filterCtx) return;
                  const colCond = filterFn(filterCtx.sigColumn);
                  const catCond = isTotals
                    ? ""
                    : `${filterCtx.categoryColumn} = '${row.category}'`;
                  onFilterClick?.({
                    label: `${isTotals ? "All" : row.category} — ${col.l}`,
                    sql: [filterCtx?.baseWhere, catCond, colCond]
                      .filter(Boolean)
                      .join(" AND "),
                  });
                }}
                className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 cursor-pointer"
                title={`View ${display} variants`}
              >
                {display}
              </button>
            ) : (
              display
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {activeCols.map((h) => (
                <th
                  key={h.k}
                  className={cn(
                    "py-2 px-2 text-muted-foreground font-medium",
                    h.k === "category" ? "text-left" : "text-right",
                  )}
                >
                  {h.l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => renderRow(row))}
            {renderRow(totals, "font-semibold bg-muted/30", true)}
            {showBaseline && (
              <tr className="border-t-2 border-border bg-primary/5 text-[11px]">
                <td className="py-1.5 px-2 text-muted-foreground italic">
                  10M Baseline
                </td>
                {numKeys.map((col) => {
                  const bk = COL_TO_BASELINE[col.k];
                  const b = bk ? IGVF_BASELINE.rates[bk] : null;
                  if (col.k === "total")
                    return (
                      <td
                        key={col.k}
                        className="py-1.5 px-2 text-right tabular-nums text-muted-foreground"
                      >
                        {(IGVF_BASELINE.totalVariants / 1e6).toFixed(1)}M
                      </td>
                    );
                  if (
                    !b ||
                    col.fmt === "float" ||
                    col.k === "expSig" ||
                    col.k === "predSig"
                  )
                    return (
                      <td
                        key={col.k}
                        className="py-1.5 px-2 text-right text-muted-foreground/30"
                      >
                        —
                      </td>
                    );
                  return (
                    <td
                      key={col.k}
                      className="py-1.5 px-2 text-right tabular-nums text-muted-foreground"
                    >
                      {fmtPct(b.rate)}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {zeroMethods.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          No predictions in this cohort:{" "}
          {zeroMethods
            .map((k) => cols.find((c) => c.k === k)?.l ?? k)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// UpSet Plot
// ============================================================================

const UPSET_METHODS_ALL = [
  { key: "pred_apc" as const, label: "aPC" },
  { key: "pred_macie" as const, label: "MACIE" },
  { key: "pred_chrombpnet" as const, label: "chromBPnet" },
  { key: "pred_clinvar" as const, label: "ClinVar" },
  { key: "pred_liver_cv2f" as const, label: "liver cV2F" },
  { key: "pred_cv2f" as const, label: "cV2F" },
  { key: "pred_liver_ase" as const, label: "liver ASE" },
  { key: "pred_ase" as const, label: "ASE" },
  { key: "pred_liver_tland" as const, label: "liver TLand" },
];

function SvgTip({
  content,
  children,
}: {
  content: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="font-mono text-xs whitespace-pre">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function UpsetPlot({
  data,
  methods: allMethods,
  onFilterClick,
  baseWhere,
}: {
  data: UpsetRow[];
  methods: typeof UPSET_METHODS_ALL;
  onFilterClick?: (f: VariantFilter) => void;
  baseWhere?: string;
}) {
  // Auto-filter to methods that have at least 1 positive prediction
  const methods = useMemo(
    () =>
      allMethods.filter((m) => data.some((d) => d[m.key as keyof UpsetRow])),
    [allMethods, data],
  );
  const active = useMemo(
    () =>
      data
        .filter((d) => methods.some((m) => d[m.key as keyof UpsetRow]))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25),
    [data, methods],
  );
  if (active.length < 2 || methods.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Not enough intersections to display.
      </p>
    );

  const setSizes = methods.map((m) => ({
    ...m,
    size: data.reduce(
      (s, d) => s + (d[m.key as keyof UpsetRow] ? d.count : 0),
      0,
    ),
  }));
  const nM = methods.length,
    nC = active.length;
  const colW = 44,
    rowH = 32,
    barMaxH = 140,
    setBarMaxW = 120,
    dotR = 7;
  const labelW = 100,
    countW = 36;
  const padL = labelW + countW + setBarMaxW + 16,
    padT = barMaxH + 32;
  const W = padL + nC * colW + 32,
    H = padT + nM * rowH + 20;
  const maxCount = Math.max(...active.map((d) => d.count), 1);
  const maxSet = Math.max(...setSizes.map((s) => s.size), 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxWidth: Math.min(W, 960) }}
      role="img"
      aria-label="Upset plot of annotation-method intersections"
    >
      <title>Upset plot of annotation-method intersections</title>
      <line
        x1={padL - 10}
        y1={padT - barMaxH - 16}
        x2={padL - 10}
        y2={H - 8}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.1}
      />
      <line
        x1={padL - 10}
        y1={padT}
        x2={W - 8}
        y2={padT}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.1}
      />
      <text
        x={padL + (nC * colW) / 2}
        y={16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        style={{ fill: "#737373" }}
      >
        Intersection Size
      </text>
      {setSizes.map((s, i) => {
        const barW = Math.max(1, (s.size / maxSet) * setBarMaxW);
        const cy = padT + i * rowH + rowH / 2;
        return (
          <g key={s.key}>
            <text
              x={labelW - 4}
              y={cy + 5}
              textAnchor="end"
              fontSize={12}
              fontWeight={500}
              style={{ fill: "#171717" }}
            >
              {s.label}
            </text>
            <text
              x={labelW + countW - 4}
              y={cy + 4}
              textAnchor="end"
              fontSize={11}
              fontWeight={500}
              style={{ fill: "#737373" }}
            >
              {s.size}
            </text>
            <rect
              x={labelW + countW + setBarMaxW - barW + 4}
              y={cy - 8}
              width={barW}
              height={16}
              rx={3}
              fill="#7c3aed"
              opacity={0.2}
            />
          </g>
        );
      })}
      {methods.map((m, i) => (
        <line
          key={m.key}
          x1={padL - 10}
          y1={padT + i * rowH + rowH / 2}
          x2={W - 8}
          y2={padT + i * rowH + rowH / 2}
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.05}
        />
      ))}
      {active.map((inter, ci) => {
        const cx = padL + ci * colW + colW / 2;
        const barH = Math.max(2, (inter.count / maxCount) * barMaxH);
        const indices = methods
          .map((m, i) => (inter[m.key as keyof UpsetRow] ? i : -1))
          .filter((i) => i >= 0);
        const sigPct =
          inter.count > 0
            ? Math.round((100 * inter.expSigCount) / inter.count)
            : 0;
        const interKey = methods
          .map((m) => (inter[m.key as keyof UpsetRow] ? "1" : "0"))
          .join("");
        return (
          <SvgTip
            key={interKey}
            content={`${inter.count} variants\n${inter.expSigCount} exp. significant (${sigPct}%)${onFilterClick ? "\nClick to view" : ""}`}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG <g> cannot be a button; interaction is decorative, full data also exposed in the table */}
            <g
              style={{ cursor: onFilterClick ? "pointer" : "default" }}
              onClick={
                onFilterClick
                  ? () => {
                      const conds = allMethods.map(
                        (m) =>
                          `${m.key} = ${inter[m.key as keyof UpsetRow] ? "true" : "false"}`,
                      );
                      const activeLabels = methods
                        .filter((m) => inter[m.key as keyof UpsetRow])
                        .map((m) => m.label);
                      onFilterClick({
                        label: `${inter.count} variants: ${activeLabels.join(" ∩ ")}`,
                        sql: [baseWhere, ...conds]
                          .filter(Boolean)
                          .join(" AND "),
                      });
                    }
                  : undefined
              }
            >
              <rect
                x={cx - 12}
                y={padT - barH - 4}
                width={24}
                height={barH}
                rx={4}
                fill="#7c3aed"
                opacity={0.85}
              />
              {inter.expSigCount > 0 && (
                <rect
                  x={cx - 12}
                  y={padT - (inter.expSigCount / maxCount) * barMaxH - 4}
                  width={24}
                  height={Math.max(2, (inter.expSigCount / maxCount) * barMaxH)}
                  rx={4}
                  fill="#059669"
                  opacity={0.6}
                />
              )}
              <text
                x={cx}
                y={padT - barH - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                style={{ fill: "#171717" }}
              >
                {inter.count}
              </text>
              {methods.map((m, mi) => (
                <circle
                  key={m.key}
                  cx={cx}
                  cy={padT + mi * rowH + rowH / 2}
                  r={dotR}
                  fill={inter[m.key as keyof UpsetRow] ? "#171717" : "none"}
                  stroke={
                    inter[m.key as keyof UpsetRow] ? "#171717" : "#d4d4d4"
                  }
                  strokeWidth={inter[m.key as keyof UpsetRow] ? 0 : 1.5}
                />
              ))}
              {indices.length > 1 && (
                <line
                  x1={cx}
                  y1={padT + Math.min(...indices) * rowH + rowH / 2}
                  x2={cx}
                  y2={padT + Math.max(...indices) * rowH + rowH / 2}
                  stroke="#171717"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              )}
            </g>
          </SvgTip>
        );
      })}
      <g transform={`translate(${W - 160}, ${padT - barMaxH - 8})`}>
        <rect
          x={0}
          y={0}
          width={12}
          height={12}
          rx={2}
          fill="#7c3aed"
          opacity={0.85}
        />
        <text x={16} y={10} fontSize={10} style={{ fill: "#737373" }}>
          Total
        </text>
        <rect
          x={0}
          y={18}
          width={12}
          height={12}
          rx={2}
          fill="#059669"
          opacity={0.6}
        />
        <text x={16} y={28} fontSize={10} style={{ fill: "#737373" }}>
          Exp. Significant
        </text>
      </g>
    </svg>
  );
}

// ============================================================================
// AF Boxplot
// ============================================================================

function AfBoxplot({ data }: { data: AfBoxplotRow[] }) {
  const groups = useMemo(
    () => [...new Set(data.map((r) => r.sigGroup))].sort(),
    [data],
  );
  const traces = useMemo(() => {
    return groups.map((grp, gi) => {
      const rows = data.filter((r) => r.sigGroup === grp);
      return {
        type: "box" as const,
        name: grp,
        x: rows.map((r) => r.population),
        lowerfence: rows.map((r) => r.p5),
        q1: rows.map((r) => r.q1),
        median: rows.map((r) => r.median),
        q3: rows.map((r) => r.q3),
        upperfence: rows.map((r) => r.p95),
        marker: { color: gi === 0 ? "#d4d4d4" : "#7c3aed" },
        line: { color: gi === 0 ? "#d4d4d4" : "#7c3aed" },
        fillcolor: gi === 0 ? "rgba(212,212,212,0.3)" : "rgba(124,58,237,0.2)",
        hovertemplate: `${grp}<br>%{x}<br>Median: %{median:.2e}<extra></extra>`,
      };
    });
  }, [data, groups]);
  if (data.length === 0) return null;
  return (
    <Plot
      data={traces}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: 350,
        margin: { l: 60, r: 20, t: 20, b: 50 },
        xaxis: { ...PLOTLY_AXIS, title: { text: "Population" } },
        yaxis: {
          ...PLOTLY_AXIS,
          title: { text: "Allele Frequency" },
          type: "log",
        },
        boxmode: "group" as const,
        legend: { x: 1.02, y: 1, xanchor: "left" as const },
        showlegend: true,
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Gene Zoom
// ============================================================================

const GENE_ZOOM_COLORS: Record<string, string> = {
  TP: "#eab308",
  FP: "#fde68a",
  FN: "#7c3aed",
  TN: "#d4d4d4",
};

function GeneZoom({ miami, gene }: { miami: MiamiPoint[]; gene: string }) {
  const pts = useMemo(
    () =>
      miami.filter(
        (pt) => pt.genes.includes(gene) && pt.upper_neglog_p != null,
      ),
    [miami, gene],
  );
  if (pts.length === 0)
    return (
      <p className="text-xs text-muted-foreground">No variants for {gene}</p>
    );
  const minPos = Math.min(...pts.map((p) => p.position));
  const maxPos = Math.max(...pts.map((p) => p.position));
  const pad = Math.max(50000, (maxPos - minPos) * 0.1);
  // 4-color: TP (func+sig), FP (func+not sig), FN (not func+sig), TN (not func+not sig)
  const colors = pts.map((p) => {
    if (p.predicted_functional && p.is_sig) return GENE_ZOOM_COLORS.TP;
    if (p.predicted_functional) return GENE_ZOOM_COLORS.FP;
    if (p.is_sig) return GENE_ZOOM_COLORS.FN;
    return GENE_ZOOM_COLORS.TN;
  });
  const sizes = pts.map((p) => (p.is_sig ? 10 : 6));
  const outlines = pts.map((p) => (p.is_sig ? "#171717" : "rgba(0,0,0,0)"));
  return (
    <div>
      <Plot
        data={[
          {
            type: "scatter" as const,
            mode: "markers" as const,
            x: pts.map((p) => p.position),
            y: pts.map((p) => p.upper_neglog_p ?? 0),
            marker: {
              color: colors,
              size: sizes,
              line: { color: outlines, width: 1.5 },
            },
            hovertemplate: "chr%{text}<br>−log₁₀p: %{y:.1f}<extra></extra>",
            text: pts.map((p) => `${p.chrom}:${p.position.toLocaleString()}`),
          },
        ]}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          title: {
            text: `${gene} ± ${Math.round(pad / 1000)}kb`,
            font: { ...PLOTLY_FONT, size: 13 },
            x: 0,
            xanchor: "left" as const,
          },
          height: 250,
          margin: { l: 50, r: 20, t: 40, b: 55 },
          xaxis: {
            ...PLOTLY_AXIS,
            title: { text: "Position" },
            range: [minPos - pad, maxPos + pad],
          },
          yaxis: {
            ...PLOTLY_AXIS,
            title: { text: "−log₁₀(p)" },
            rangemode: "tozero" as const,
          },
          shapes: [
            {
              type: "line" as const,
              x0: minPos - pad,
              x1: maxPos + pad,
              y0: -Math.log10(0.05),
              y1: -Math.log10(0.05),
              line: { color: "#3b82f6", width: 1, dash: "dash" as const },
            },
          ],
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    </div>
  );
}

// ============================================================================
// Dataset Report View (renders one dataset's full analysis)
// ============================================================================

function DatasetReportView({
  report: dr,
  onFilterClick,
}: {
  report: DatasetReport;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const [miamiMode, setMiamiMode] = useState<MiamiMode>("functional");
  const [upsetMode, setUpsetMode] = useState<
    "all" | "coding" | "noncoding" | "sig"
  >("all");
  const [selectedGene, setSelectedGene] = useState<string | null>(null);

  const datasetWhere =
    dr.dataset.mode === "within" ? dr.dataset.presenceColumn : "";
  const sigColumn =
    dr.dataset.mode === "within"
      ? dr.dataset.sigColumn
      : dr.dataset.presenceColumn;

  const marginalData = useMemo(() => toForestData(dr.forest), [dr.forest]);
  const jointData = useMemo(() => {
    if (!dr.jointForest) return null;
    // Filter out zero-variance methods (OR=1, CI=[1,1]) from joint model display
    const filtered = dr.jointForest.filter(
      (r) => !(r.or === 1 && r.orLo === 1 && r.orHi === 1),
    );
    return filtered.length > 0
      ? filtered.map((r) => ({
          label: r.method,
          estimate: r.or,
          lo: r.orLo,
          hi: r.orHi,
        }))
      : null;
  }, [dr.jointForest]);
  const logfcData = useMemo(() => toLogfcForest(dr.logfc), [dr.logfc]);
  const recallData = useMemo(() => toRecallForest(dr.forest), [dr.forest]);
  const precisionData = useMemo(
    () => toPrecisionForest(dr.forest),
    [dr.forest],
  );
  const manhattanData = useMemo(
    () => toManhattan(dr.miami, miamiMode),
    [dr.miami, miamiMode],
  );

  const upsetData = useMemo(() => {
    switch (upsetMode) {
      case "coding":
        return dr.upsetCoding;
      case "noncoding":
        return dr.upsetNoncoding;
      case "sig":
        return dr.upsetSigOnly;
      default:
        return dr.upset;
    }
  }, [dr, upsetMode]);

  const hasMiami = dr.miami.length > 0 && dr.dataset.pvalColumns;
  const hasLogfc = dr.dataset.zColumn !== null && logfcData.length > 0;

  // Stats + narrative derived from forest rows.
  const { bestMethod, sigMethods, narrative } = useMemo(() => {
    const sigPct =
      dr.variantCount > 0
        ? ((dr.sigCount / dr.variantCount) * 100).toFixed(1)
        : "0";
    const activeMethods = dr.forest.filter(
      (r) => r.tp + r.fp > 0 && r.method !== "Overall",
    );
    const best =
      activeMethods.length > 0
        ? [...activeMethods].sort((a, b) => b.or - a.or)[0]
        : null;
    const sig = activeMethods.filter((r) => r.significant);
    const nonSig = activeMethods
      .filter((r) => !r.significant)
      .map((r) => r.method);

    let text = `Of ${dr.variantCount.toLocaleString()} ${dr.dataset.label} variants, ${dr.sigCount} (${sigPct}%) are experimentally significant.`;
    if (best) {
      text += ` ${best.method} is the strongest marginal predictor (OR ${best.or.toFixed(1)}, 95% CI ${best.orLo.toFixed(1)}–${best.orHi.toFixed(1)}) capturing ${best.tp} of ${dr.sigCount} significant variants.`;
    }
    if (dr.jointForest) {
      const jointActive = dr.jointForest.filter(
        (r) => !(r.or === 1 && r.orLo === 1 && r.orHi === 1) && r.significant,
      );
      if (jointActive.length > 0) {
        text += ` In the joint model, ${jointActive.map((r) => r.method).join(" and ")} retain${jointActive.length === 1 ? "s" : ""} independent predictive value.`;
      }
    }
    if (nonSig.length > 0 && nonSig.length <= 4) {
      text += ` ${nonSig.join(", ")} do${nonSig.length === 1 ? "es" : ""} not reach significance in this cohort.`;
    }
    return { bestMethod: best, sigMethods: sig, narrative: text };
  }, [dr]);

  const sigPct =
    dr.variantCount > 0 ? (dr.sigCount / dr.variantCount) * 100 : 0;
  const labelPrefix = dr.dataset.label;

  return (
    <div
      id={`dataset-${dr.dataset.id}`}
      className="space-y-8 scroll-mt-16 print:break-before-page print:break-inside-avoid"
    >
      {/* Dataset header — orients the reader, rescues sigMethods + best method */}
      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {labelPrefix}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dr.dataset.sigDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <Stat label="Variants" value={dr.variantCount.toLocaleString()} />
            <Stat
              label="Significant"
              value={`${dr.sigCount.toLocaleString()} (${sigPct.toFixed(1)}%)`}
            />
            {bestMethod && (
              <Stat
                label="Best marginal"
                value={`${bestMethod.method} OR ${bestMethod.or.toFixed(1)}`}
              />
            )}
          </div>
        </div>
        {sigMethods.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[11px] text-muted-foreground">
              Significant methods:
            </span>
            {sigMethods.map((m) => (
              <span
                key={m.method}
                className="px-2 py-0.5 text-[11px] rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                {m.method}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          {narrative}
        </p>
      </header>

      {/* Experimental overview — crosshair scatter matching PPTX slide 11/20/28 per dataset */}
      {dr.dataset.pvalColumns && dr.miami.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Each point is a variant. Dashed red lines mark the significance threshold (−log₁₀ 0.05) — outlined points are experimentally significant.">
            {labelPrefix} — Predictions vs Experimental p-values
          </SectionTitle>
          <ExperimentalOverviewPlot dr={dr} />
          <PlotCaption>
            Colors: TP = predicted &amp; significant (gold, outlined) · FP =
            predicted, not significant (pale) · FN = significant but not
            predicted (purple, outlined) · TN = neither (grey). A good predictor
            concentrates points in the TP quadrant.
          </PlotCaption>
        </section>
      )}

      {/* 1. Summary Tables — orient the user first */}
      {dr.summary.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SummaryTable
            data={dr.summary}
            title={`${labelPrefix} — Variant Summary by Category`}
            showBaseline
            onFilterClick={onFilterClick}
            filterCtx={{
              baseWhere: datasetWhere,
              sigColumn,
              categoryColumn: "variant_category",
            }}
          />
          {dr.summaryCage.length > 0 && (
            <div className="mt-6">
              <SummaryTable
                data={dr.summaryCage}
                title={`${labelPrefix} — Noncoding by CAGE Category`}
                onFilterClick={onFilterClick}
                filterCtx={{
                  baseWhere: datasetWhere
                    ? `${datasetWhere} AND variant_category = 'Noncoding'`
                    : "variant_category = 'Noncoding'",
                  sigColumn,
                  categoryColumn: "cage_category",
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* 2. Joint Model — multivariate logistic regression (PPTX slide order: Joint before Marginal) */}
      {jointData &&
        jointData.length > 0 &&
        (() => {
          const excluded =
            dr.jointForest
              ?.filter((r) => r.or === 1 && r.orLo === 1 && r.orHi === 1)
              .map((r) => r.method) ?? [];
          return (
            <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
              <SectionTitle subtitle="Ridge-regularized logistic regression. Shows independent predictive value when controlling for all other methods.">
                {labelPrefix} — Joint Model
              </SectionTitle>
              <ForestPlot
                data={jointData}
                title={`${labelPrefix} (${dr.sigCount} significant of ${dr.variantCount})`}
                xLabel="Joint OR (95% CI)"
              />
              <PlotCaption>
                OR &gt; 1 (right of the dashed line) = method retains
                independent association with significance after controlling for
                the other methods. 95% CIs from ridge-regularized Fisher
                information.
              </PlotCaption>
              {excluded.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Excluded (fewer than 3 predicted variants):{" "}
                  {excluded.join(", ")}
                </p>
              )}
            </section>
          );
        })()}

      {/* 3. Marginal Model — univariate ORs */}
      {marginalData.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle
            subtitle={`${dr.dataset.sigDescription}. Each method tested independently (2×2 table).`}
          >
            {labelPrefix} — Marginal Model
          </SectionTitle>
          <ForestPlot
            data={marginalData}
            title={`${labelPrefix} (${dr.sigCount} significant of ${dr.variantCount})`}
            xLabel="Marginal OR (95% CI)"
          />
          <PlotCaption>
            Odds ratio with 95% CI from Haldane-corrected 2×2 contingency. OR
            &gt; 1 (right of the dashed line) = enrichment in experimentally
            significant variants.
          </PlotCaption>
        </section>
      )}

      {/* 3b. logFC Forest — only datasets with a z-score column (e.g. base editing) */}
      {hasLogfc && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Mean Z-score among variants predicted functional by each method. Negative Z = reduced LDL efflux (expected direction for functional variants).">
            {labelPrefix} — Mean Z-score by Method
          </SectionTitle>
          <ForestPlot
            data={logfcData}
            title="Effect-size Z"
            xLabel="Mean Z-score (95% CI)"
            refLine={0}
            logX={false}
          />
          <PlotCaption>
            Tests whether predicted-functional variants shift the continuous
            experimental effect size away from 0, complementing the binary
            significance tests above.
          </PlotCaption>
        </section>
      )}

      {/* 4. Recall */}
      {recallData.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle
            subtitle={`Recall (sensitivity) — proportion of ${dr.sigCount} significant variants captured by each method. Wilson 95% CIs.`}
          >
            {labelPrefix} — Recall
          </SectionTitle>
          <ForestPlot
            data={recallData}
            title={`Recall (${dr.sigCount} sig.)`}
            xLabel="Recall (95% CI)"
            logX={false}
            refLine={null}
          />
          <PlotCaption>
            Recall = TP / (TP + FN). Counts next to each method: TP / (TP + FN).
          </PlotCaption>
        </section>
      )}

      {/* 5. Precision */}
      {precisionData.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Precision (PPV) — proportion of predicted-functional variants that are experimentally significant. Wilson 95% CIs.">
            {labelPrefix} — Precision
          </SectionTitle>
          <ForestPlot
            data={precisionData}
            title={`Precision (${dr.sigCount} sig.)`}
            xLabel="Precision (95% CI)"
            logX={false}
            refLine={null}
          />
          <PlotCaption>
            Precision = TP / (TP + FP). Counts next to each method: TP / (TP +
            FP).
          </PlotCaption>
        </section>
      )}

      {/* 6. Combined Recall + Precision side-by-side — matches final PPTX slide per dataset */}
      {recallData.length > 0 && precisionData.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Recall and precision side-by-side so trade-offs are obvious at a glance.">
            {labelPrefix} — Recall &amp; Precision
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ForestPlot
              data={recallData}
              title="Recall"
              xLabel="Recall (95% CI)"
              logX={false}
              refLine={null}
            />
            <ForestPlot
              data={precisionData}
              title="Precision"
              xLabel="Precision (95% CI)"
              logX={false}
              refLine={null}
            />
          </div>
          <PlotCaption>
            A method with high recall but low precision flags most significant
            variants but also many non-significant ones; high precision with low
            recall is the opposite.
          </PlotCaption>
        </section>
      )}

      {/* 7. PR Curves */}
      {dr.prCurves.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Threshold sweep on continuous annotation scores. Methods with only binary flags appear as single points.">
            {labelPrefix} — PR Curves
          </SectionTitle>
          <PRCurve data={dr.prCurves} />
          <PlotCaption>
            Each curve = precision/recall as the score threshold is swept. A
            curve hugging the top-right corner is best. Single dots = methods
            with only a binary flag (no threshold to sweep).
          </PlotCaption>
        </section>
      )}

      {/* 8. Manhattan / locus plot */}
      {hasMiami && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <SectionTitle subtitle="Genomic positions colored by annotation category.">
              {labelPrefix} — Locus Plot
            </SectionTitle>
            <SegmentedControl
              value={miamiMode}
              onChange={setMiamiMode}
              options={[
                { value: "functional", label: "Pred. Functional" },
                { value: "exonic", label: "Exonic" },
                { value: "cage", label: "CAGE" },
                { value: "encode", label: "ENCODE" },
              ]}
            />
          </div>
          {manhattanData.length > 0 ? (
            <>
              <ManhattanPlot
                data={manhattanData}
                yLabel="−log₁₀(p-value)"
                threshold={-Math.log10(0.05)}
              />
              <ManhattanLegend mode={miamiMode} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No variants in this mode.
            </p>
          )}
        </section>
      )}

      {/* 9. UpSet plot */}
      {dr.upset.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <SectionTitle subtitle="Method intersection matrix with experimental significance overlay.">
              {labelPrefix} — Method Overlap (UpSet)
            </SectionTitle>
            <SegmentedControl
              value={upsetMode}
              onChange={setUpsetMode}
              options={[
                { value: "all", label: "All" },
                { value: "coding", label: "Coding" },
                { value: "noncoding", label: "Noncoding" },
                { value: "sig", label: "Sig. Only" },
              ]}
            />
          </div>
          {upsetData.length > 0 ? (
            <UpsetPlot
              data={upsetData}
              methods={UPSET_METHODS_ALL}
              onFilterClick={onFilterClick}
              baseWhere={datasetWhere}
            />
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No intersections in this mode.
            </p>
          )}
          <PlotCaption>
            Each column = a unique combination of prediction methods. Purple bar
            = variants matching that combination; green overlay = those that
            were experimentally significant. Dots below each bar mark which
            methods are in the combination.
          </PlotCaption>
        </section>
      )}

      {/* 10. Per-gene zoom */}
      {dr.geneList.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
          <SectionTitle subtitle="Select a gene to zoom into its region.">
            {labelPrefix} — Per-Gene Zoom
          </SectionTitle>
          <GeneZoomLegend />
          <div className="flex flex-wrap gap-1.5 mb-4 max-h-24 overflow-y-auto">
            {dr.geneList.map((gene) => (
              <button
                key={gene}
                type="button"
                onClick={() =>
                  setSelectedGene(selectedGene === gene ? null : gene)
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors border",
                  selectedGene === gene
                    ? "bg-primary/10 text-foreground border-primary/30 font-medium"
                    : "text-muted-foreground border-border hover:bg-accent hover:text-foreground",
                )}
              >
                {gene}
              </button>
            ))}
          </div>
          {selectedGene && <GeneZoom miami={dr.miami} gene={selectedGene} />}
          {selectedGene && onFilterClick && (
            <button
              type="button"
              onClick={() =>
                onFilterClick({
                  label: `Variants in ${selectedGene}`,
                  sql: [datasetWhere, `list_contains(genes, '${selectedGene}')`]
                    .filter(Boolean)
                    .join(" AND "),
                })
              }
              className="text-xs text-primary hover:text-primary/80 underline decoration-primary/30 mt-2 block"
            >
              View all variants in {selectedGene} →
            </button>
          )}
        </section>
      )}
    </div>
  );
}

/** Inline stat cell for the dataset header card. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

/** Mode-specific legend for the locus (Manhattan) plot. */
function ManhattanLegend({ mode }: { mode: MiamiMode }) {
  const items: Array<{ color: string; label: string; outline?: boolean }> =
    (() => {
      switch (mode) {
        case "functional":
          return [
            { color: "#eab308", label: "Predicted functional" },
            { color: "#6b21a8", label: "Not predicted functional" },
          ];
        case "exonic":
          return Object.entries(EXONIC_COLORS).map(([label, color]) => ({
            color,
            label,
          }));
        case "cage":
          return Object.entries(CAGE_COLORS).map(([label, color]) => ({
            color,
            label,
          }));
        case "encode":
          return Object.entries(ENCODE_ELEMENT_COLORS).map(
            ([label, color]) => ({ color, label }),
          );
        default:
          return assertNever(mode);
      }
    })();
  return (
    <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full border-2 border-foreground"
          style={{ backgroundColor: "transparent" }}
        />
        Outlined = experimentally significant
      </span>
    </div>
  );
}

/** Static legend for the gene-zoom TP/FP/FN/TN color scheme. */
function GeneZoomLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-muted-foreground">
      {(
        [
          ["TP", "Pred. func + Sig"],
          ["FP", "Pred. func + Not sig"],
          ["FN", "Not pred. + Sig"],
          ["TN", "Not pred. + Not sig"],
        ] as const
      ).map(([key, label]) => (
        <span key={key} className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: GENE_ZOOM_COLORS[key],
              border:
                key === "TP" || key === "FN" ? "1.5px solid #171717" : "none",
            }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// Section 1: Cohort Overview
// ============================================================================

function CohortOverview({
  report,
  onFilterClick,
}: {
  report: IgvfReportData;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const loaded = report.loadedTables.filter((t) => t.rows > 0);
  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-4">
      <SectionTitle subtitle="Which experimental datasets overlap and how many variants each.">
        Cohort Overview
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center">
          {onFilterClick ? (
            <button
              type="button"
              onClick={() =>
                onFilterClick({ label: "All variants", sql: "TRUE" })
              }
              className="text-2xl font-semibold text-primary hover:text-primary/80 tabular-nums underline decoration-primary/30 cursor-pointer"
            >
              {report.totalVariants.toLocaleString()}
            </button>
          ) : (
            <p className="text-2xl font-semibold text-foreground tabular-nums">
              {report.totalVariants.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Total variants (resolved)
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {report.availableDatasets.length}
          </p>
          <p className="text-xs text-muted-foreground">Experimental datasets</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {loaded.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Enrichment sources loaded
          </p>
        </div>
      </div>

      {/* Dataset overlap */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">
          Experimental Dataset Overlap
        </p>
        <div className="space-y-1.5">
          {DATASET_DEFS.map((def) => {
            const r = report.reports[def.id];
            const skipped = report.skippedDatasets?.find(
              (s) => s.id === def.id,
            );
            // enrichment mode: sigCount IS the overlap (finemapped count), variantCount is full cohort
            const n = r
              ? def.mode === "enrichment"
                ? r.sigCount
                : r.variantCount
              : (skipped?.variantCount ?? 0);
            const pct =
              report.totalVariants > 0
                ? ((n / report.totalVariants) * 100).toFixed(1)
                : "0";
            const isSkipped = !r && skipped;
            const hasData = n > 0;
            return (
              <div key={def.id} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isSkipped
                      ? "bg-amber-500"
                      : hasData
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "w-32",
                    hasData
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {def.label}
                </span>
                {isSkipped ? (
                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    only {n} variant{n === 1 ? "" : "s"} — skipped (min 10)
                  </span>
                ) : hasData && onFilterClick ? (
                  <button
                    type="button"
                    onClick={() =>
                      onFilterClick({
                        label: `${def.label} variants`,
                        sql: def.presenceColumn,
                      })
                    }
                    className="text-primary hover:text-primary/80 tabular-nums underline decoration-primary/30 cursor-pointer text-xs"
                  >
                    {n.toLocaleString()} ({pct}%)
                  </button>
                ) : (
                  <span className="text-muted-foreground tabular-nums">
                    {hasData ? `${n.toLocaleString()} (${pct}%)` : "No overlap"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loaded tables */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">
          Enrichment Sources
        </p>
        <div className="flex flex-wrap gap-1.5">
          {report.loadedTables.map((t) => (
            <span
              key={t.label}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded-md border",
                t.rows > 0
                  ? "border-primary/20 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground/50",
              )}
            >
              {t.label}{" "}
              {t.rows > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({t.rows.toLocaleString()})
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Section 3: Cross-Dataset Context
// ============================================================================

function CrossDatasetContext({
  data,
  onFilterClick,
}: {
  data: CrossDatasetData;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const hasDhs = data.dhsSummary.some(
    (d) => d.promoterCount > 0 || d.enhancerCount > 0,
  );
  const hasGwas = data.gwasContext.some((g) => g.total > 0);
  const hasColoc = data.colocSummary && data.colocSummary.totalVariants > 0;
  const hasFinemap = data.finemapSummary.length > 0;
  const hasAf = data.afBoxplot.length > 0;
  const hasBaseline = data.baselineRates && data.baselineRates.length > 0;
  const hasSharedBeCrispri =
    data.sharedBeCrispri != null && data.sharedBeCrispri.totalOverlap > 0;

  if (
    !hasDhs &&
    !hasGwas &&
    !hasColoc &&
    !hasFinemap &&
    !hasAf &&
    !hasBaseline &&
    !hasSharedBeCrispri
  )
    return null;

  return (
    <div className="space-y-8">
      <h2 className="text-base font-semibold text-foreground pt-2">
        Cross-Dataset Context
      </h2>

      {/* BE ∩ CRISPRi — matches PPTX slides 53-54 */}
      {hasSharedBeCrispri && data.sharedBeCrispri && (
        <SharedBeCrispriPanel
          data={data.sharedBeCrispri}
          onFilterClick={onFilterClick}
        />
      )}

      {/* AF Boxplot */}
      {hasAf && (
        <section className="rounded-lg border border-border bg-card p-4">
          <SectionTitle subtitle="gnomAD genome AF by population, grouped by predicted functional status.">
            Allele Frequency by Population
          </SectionTitle>
          <AfBoxplot data={data.afBoxplot} />
        </section>
      )}

      {/* DHS Overlap */}
      {hasDhs && (
        <section className="rounded-lg border border-border bg-card p-4">
          <SectionTitle subtitle="Promoter and enhancer linked genes from DHS overlap analysis.">
            DHS Overlap Summary
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-left text-muted-foreground font-medium">
                    Source
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Promoter Variants
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Enhancer Variants
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Linked Promoter Genes
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Linked Enhancer Genes
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dhsSummary.map((d) => {
                  const tbl =
                    d.source === "MGH" ? "dhs_overlap_mgh" : "dhs_overlap_unc";
                  return (
                    <tr key={d.source} className="border-b border-border/50">
                      <td className="py-1.5 px-2 text-foreground font-medium">
                        {d.source}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <Clickable
                          value={d.promoterCount}
                          label={`${d.source} DHS Promoter variants`}
                          sql={`vid IN (SELECT vid FROM ${tbl} WHERE DHS_promoter = 1)`}
                          onClick={onFilterClick}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <Clickable
                          value={d.enhancerCount}
                          label={`${d.source} DHS Enhancer variants`}
                          sql={`vid IN (SELECT vid FROM ${tbl} WHERE DHS_enhancer = 1)`}
                          onClick={onFilterClick}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                        {d.promoterGenes}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                        {d.enhancerGenes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* GWAS Context */}
      {hasGwas && (
        <section className="rounded-lg border border-border bg-card p-4">
          <SectionTitle subtitle="UKB and TOPMed LDL GWAS p-values for cohort variants.">
            GWAS Context
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-left text-muted-foreground font-medium">
                    Study
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Variants
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Genome-wide (p&lt;5e-8)
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Nominal (p&lt;0.05)
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Min p-value
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.gwasContext.map((g) => {
                  const tbl =
                    g.source === "UKB LDL" ? "gwas_ukb_ldl" : "gwas_topmed_ldl";
                  return (
                    <tr key={g.source} className="border-b border-border/50">
                      <td className="py-1.5 px-2 text-foreground font-medium">
                        {g.source}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <Clickable
                          value={g.total}
                          label={`${g.source} — all variants`}
                          sql={`vid IN (SELECT vid FROM ${tbl})`}
                          onClick={onFilterClick}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <Clickable
                          value={g.genomeWideSig}
                          label={`${g.source} — genome-wide significant`}
                          sql={`vid IN (SELECT vid FROM ${tbl} WHERE pvalue < 5e-8)`}
                          onClick={onFilterClick}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <Clickable
                          value={g.nominalSig}
                          label={`${g.source} — nominal significant`}
                          sql={`vid IN (SELECT vid FROM ${tbl} WHERE pvalue < 0.05)`}
                          onClick={onFilterClick}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-foreground whitespace-nowrap">
                        {g.minP < 1 ? g.minP.toExponential(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Colocalization */}
      {hasColoc && data.colocSummary && (
        <section className="rounded-lg border border-border bg-card p-4">
          <SectionTitle subtitle="Trait-tissue colocalization evidence for cohort variants.">
            Colocalization Summary
          </SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <Clickable
                value={data.colocSummary.totalVariants}
                label="Variants with colocalization"
                sql="vid IN (SELECT vid FROM coloc)"
                onClick={onFilterClick}
                className="text-lg font-semibold tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Variants with coloc
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {data.colocSummary.totalColocs.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Total colocalizations
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {data.colocSummary.totalTraits.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Traits</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {data.colocSummary.avgMaxVcp.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">Mean max VCP</p>
            </div>
          </div>
        </section>
      )}

      {/* Finemapping Evidence */}
      {hasFinemap && (
        <section className="rounded-lg border border-border bg-card p-4">
          <SectionTitle subtitle="TOPMed multi-ancestry finemapping scores for cohort variants.">
            Finemapping Evidence
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-left text-muted-foreground font-medium">
                    Trait
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    Variants
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    UKB FINEMAP
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    UKB SuSiE
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    BBJ FINEMAP
                  </th>
                  <th className="py-2 px-2 text-right text-muted-foreground font-medium">
                    BBJ SuSiE
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.finemapSummary.map((f) => (
                  <tr key={f.trait} className="border-b border-border/50">
                    <td className="py-1.5 px-2 text-foreground font-medium">
                      {f.trait}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      <Clickable
                        value={f.n}
                        label={`Finemapped — ${f.trait}`}
                        sql={`vid IN (SELECT vid FROM finemapped_topmed WHERE trait = '${f.trait}')`}
                        onClick={onFilterClick}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                      {f.avgUkbFinemap?.toFixed(4) ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                      {f.avgUkbSusie?.toFixed(4) ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                      {f.avgBbjFinemap?.toFixed(4) ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                      {f.avgBbjSusie?.toFixed(4) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Baseline Rates */}
      {hasBaseline && data.baselineRates && (
        <BaselineTable data={data} onFilterClick={onFilterClick} />
      )}
    </div>
  );
}

// ============================================================================
// Baseline Enrichment Comparison (sortable)
// ============================================================================

interface BaselineRow {
  method: string;
  cohortN: number;
  cohortRate: number;
  baselineRate: number;
  fold: number;
}

function BaselineTable({
  data,
  onFilterClick,
}: {
  data: CrossDatasetData;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const rows = useMemo<BaselineRow[]>(() => {
    const total = data.cohortTotal ?? 0;
    return (data.baselineRates ?? []).map((b) => {
      const cohortN = data.cohortPredCounts?.[b.method] ?? 0;
      const cohortRate = total > 0 ? cohortN / total : 0;
      const fold = b.rate > 0 ? cohortRate / b.rate : 0;
      return {
        method: b.method.replace("pred_", ""),
        cohortN,
        cohortRate,
        baselineRate: b.rate,
        fold,
      };
    });
  }, [data]);
  const {
    rows: sorted,
    sortKey,
    sortDir,
    setSort,
  } = useSortableRows<BaselineRow>(rows, "fold", "desc");

  return (
    <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
      <SectionTitle
        subtitle={`Cohort prediction rates vs IGVF 10M background (${IGVF_BASELINE.totalVariants.toLocaleString()} variants). Click a column to sort.`}
      >
        Baseline Enrichment Comparison
      </SectionTitle>
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <SortHeader<BaselineRow>
                col="method"
                label="Method"
                align="left"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={setSort}
              />
              <SortHeader<BaselineRow>
                col="cohortN"
                label="Cohort"
                align="right"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={setSort}
              />
              <SortHeader<BaselineRow>
                col="cohortRate"
                label="Cohort Rate"
                align="right"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={setSort}
              />
              <SortHeader<BaselineRow>
                col="baselineRate"
                label="10M Rate"
                align="right"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={setSort}
              />
              <SortHeader<BaselineRow>
                col="fold"
                label="Fold"
                align="right"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={setSort}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const foldColor =
                r.fold >= 2
                  ? "text-emerald-600 font-semibold"
                  : r.fold >= 1.5
                    ? "text-emerald-600"
                    : "text-foreground";
              return (
                <tr key={r.method} className="border-b border-border/50">
                  <td className="py-1.5 px-2 text-foreground font-medium">
                    {r.method}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {r.cohortN > 0 && onFilterClick ? (
                      <button
                        type="button"
                        onClick={() =>
                          onFilterClick({
                            label: `${r.method} variants`,
                            sql: `pred_${r.method}`,
                          })
                        }
                        className="text-primary hover:text-primary/80 underline decoration-primary/30 cursor-pointer"
                      >
                        {r.cohortN}
                      </button>
                    ) : (
                      <span className="text-foreground">{r.cohortN}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                    {fmtPct(r.cohortRate)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                    {fmtPct(r.baselineRate)}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 px-2 text-right tabular-nums",
                      foldColor,
                    )}
                  >
                    {r.fold >= 0.05
                      ? `${r.fold.toFixed(1)}x`
                      : r.fold > 0
                        ? `${r.fold.toFixed(2)}x`
                        : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================================
// BE ∩ CRISPRi Shared Significance (PPTX slides 53-54)
// ============================================================================

function SharedBeCrispriPanel({
  data,
  onFilterClick,
}: {
  data: SharedBeCrispri;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const threshold = -Math.log10(0.05);
  // 4 quadrants keyed by (beSig, crispriSig)
  const groups = [
    { key: "both", label: "Sig in both", color: "#eab308", outline: true },
    {
      key: "be_only",
      label: "Sig in BE only",
      color: "#7c3aed",
      outline: false,
    },
    {
      key: "crispri_only",
      label: "Sig in CRISPRi only",
      color: "#06b6d4",
      outline: false,
    },
    {
      key: "neither",
      label: "Sig in neither",
      color: "#d4d4d4",
      outline: false,
    },
  ] as const;
  const traces = groups.map((g) => {
    const gpts = data.points.filter((p) => {
      if (g.key === "both") return p.beSig && p.crispriSig;
      if (g.key === "be_only") return p.beSig && !p.crispriSig;
      if (g.key === "crispri_only") return !p.beSig && p.crispriSig;
      return !p.beSig && !p.crispriSig;
    });
    return {
      type: "scatter" as const,
      mode: "markers" as const,
      name: `${g.label} (${gpts.length})`,
      x: gpts.map((p) => p.beNegLogP ?? 0),
      y: gpts.map((p) => p.crispriNegLogP ?? 0),
      marker: {
        color: g.color,
        size: 8,
        line: g.outline
          ? { color: "#171717", width: 1 }
          : { color: "rgba(0,0,0,0)", width: 0 },
      },
      hovertemplate:
        "%{text}<br>BE −log₁₀p: %{x:.2f}<br>CRISPRi −log₁₀p: %{y:.2f}<extra></extra>",
      text: gpts.map(
        (p) =>
          `${p.variantVcf || `chr${p.chrom}:${p.position.toLocaleString()}`}${
            p.genes.length > 0 ? ` · ${p.genes.slice(0, 3).join(", ")}` : ""
          }`,
      ),
    };
  });
  return (
    <section className="rounded-lg border border-border bg-card p-4 print:break-inside-avoid">
      <SectionTitle
        subtitle={`${data.totalOverlap.toLocaleString()} variants measured in both experiments · ${data.bothSigCount} significant in both · dashed lines mark p = 0.05.`}
      >
        Base Editing ∩ CRISPRi — Shared Significance
      </SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
        <QuadrantStat label="Sig in both" value={data.bothSigCount} />
        <QuadrantStat label="BE only" value={data.beOnlySigCount} />
        <QuadrantStat label="CRISPRi only" value={data.crispriOnlySigCount} />
        <QuadrantStat
          label="Neither"
          value={
            data.totalOverlap -
            data.bothSigCount -
            data.beOnlySigCount -
            data.crispriOnlySigCount
          }
        />
      </div>

      <Plot
        data={traces}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          height: 400,
          margin: { l: 60, r: 20, t: 20, b: 60 },
          xaxis: {
            ...PLOTLY_AXIS,
            title: { text: "Base Editing −log₁₀(p) — best of efflux / uptake" },
            rangemode: "tozero" as const,
          },
          yaxis: {
            ...PLOTLY_AXIS,
            title: { text: "CRISPRi −log₁₀(p) — BEAN betabinom" },
            rangemode: "tozero" as const,
          },
          shapes: [
            {
              type: "line" as const,
              x0: threshold,
              x1: threshold,
              y0: 0,
              y1: 1,
              yref: "paper" as const,
              line: { color: "#dc2626", dash: "dash" as const, width: 1 },
            },
            {
              type: "line" as const,
              y0: threshold,
              y1: threshold,
              x0: 0,
              x1: 1,
              xref: "paper" as const,
              line: { color: "#dc2626", dash: "dash" as const, width: 1 },
            },
          ],
          legend: {
            orientation: "h" as const,
            y: -0.16,
            xanchor: "center" as const,
            x: 0.5,
          },
          showlegend: true,
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />

      {onFilterClick && data.bothSigCount > 0 && (
        <button
          type="button"
          onClick={() =>
            onFilterClick({
              label: `${data.bothSigCount} variants sig in both BE & CRISPRi`,
              sql: "has_be AND has_crispri AND either_sig AND crispri_sig",
            })
          }
          className="text-xs text-primary hover:text-primary/80 underline decoration-primary/30 mt-3 block"
        >
          View {data.bothSigCount} variants significant in both →
        </button>
      )}

      <PlotCaption>
        Only variants measured in <em>both</em> experiments are shown. Upper-
        right quadrant = hits worth following up (significant in both — the "44
        variants" Rich flagged for perturb-seq). Variants just missing
        significance in one assay sit along the dashed lines; useful for
        borderline candidate selection.
      </PlotCaption>
    </section>
  );
}

function QuadrantStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ============================================================================
// Experimental Overview (crosshair plot — matches Eric's PPTX slide 11/20/28)
// ============================================================================

/** 4-color categorization of a variant by (predicted_functional, experimentally_significant). */
function tpCategory(p: MiamiPoint): "TP" | "FP" | "FN" | "TN" {
  if (p.predicted_functional && p.is_sig) return "TP";
  if (p.predicted_functional) return "FP";
  if (p.is_sig) return "FN";
  return "TN";
}

const TP_CATEGORY_COLORS: Record<"TP" | "FP" | "FN" | "TN", string> = {
  TP: "#eab308",
  FP: "#fde68a",
  FN: "#7c3aed",
  TN: "#d4d4d4",
};

/**
 * Overview scatter with threshold crosshairs, one per dataset.
 *
 * Dual-p datasets (base editing: efflux × uptake): 2D scatter of both p-values
 * with vertical + horizontal crosshair at −log10(0.05), colored TP/FP/FN/TN.
 *
 * Single-p datasets (MPRA): strip scatter of −log10(q) against predicted-
 * functional (jittered) with a horizontal crosshair at the significance cutoff.
 *
 * Enrichment-mode datasets (finemapped): no continuous experimental score —
 * returns null, no plot rendered.
 */
function ExperimentalOverviewPlot({ dr }: { dr: DatasetReport }) {
  const pts = useMemo(
    () => dr.miami.filter((p) => p.upper_neglog_p != null),
    [dr.miami],
  );
  if (!dr.dataset.pvalColumns || pts.length === 0) return null;

  const hasDualP = pts.some((p) => p.lower_neglog_p != null);
  const threshold = -Math.log10(0.05);
  const groups = ["TP", "FP", "FN", "TN"] as const;

  if (hasDualP) {
    const withBoth = pts.filter((p) => p.lower_neglog_p != null);
    const traces = groups.map((g) => {
      const gpts = withBoth.filter((p) => tpCategory(p) === g);
      const outline = g === "TP" || g === "FN";
      return {
        type: "scatter" as const,
        mode: "markers" as const,
        name: `${g} (${gpts.length})`,
        x: gpts.map((p) => p.lower_neglog_p ?? 0),
        y: gpts.map((p) => p.upper_neglog_p ?? 0),
        marker: {
          color: TP_CATEGORY_COLORS[g],
          size: 7,
          line: outline
            ? { color: "#171717", width: 1 }
            : { color: "rgba(0,0,0,0)", width: 0 },
        },
        hovertemplate:
          "%{text}<br>upper −log₁₀p: %{y:.2f}<br>lower −log₁₀p: %{x:.2f}<extra></extra>",
        text: gpts.map(
          (p) => `chr${p.chrom}:${p.position.toLocaleString()} · ${g}`,
        ),
      };
    });
    return (
      <Plot
        data={traces}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          height: 380,
          margin: { l: 60, r: 20, t: 20, b: 60 },
          xaxis: {
            ...PLOTLY_AXIS,
            title: { text: "−log₁₀(p) — lower assay" },
            rangemode: "tozero" as const,
          },
          yaxis: {
            ...PLOTLY_AXIS,
            title: { text: "−log₁₀(p) — upper assay" },
            rangemode: "tozero" as const,
          },
          shapes: [
            {
              type: "line" as const,
              x0: threshold,
              x1: threshold,
              y0: 0,
              y1: 1,
              yref: "paper" as const,
              line: { color: "#dc2626", dash: "dash" as const, width: 1 },
            },
            {
              type: "line" as const,
              y0: threshold,
              y1: threshold,
              x0: 0,
              x1: 1,
              xref: "paper" as const,
              line: { color: "#dc2626", dash: "dash" as const, width: 1 },
            },
          ],
          legend: {
            orientation: "h" as const,
            y: -0.18,
            xanchor: "center" as const,
            x: 0.5,
          },
          showlegend: true,
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    );
  }

  // Strip scatter for single-p datasets.
  // Pre-compute a deterministic jitter keyed by position so points are stable
  // across renders and still spread horizontally within each predicted category.
  const jitterFor = (position: number) => {
    // Mulberry-style hash of position → [-0.175, +0.175]
    let h = position >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h = (h ^ (h >>> 16)) >>> 0;
    return (h / 0xffffffff - 0.5) * 0.35;
  };
  const traces = groups.map((g) => {
    const gpts = pts.filter((p) => tpCategory(p) === g);
    const outline = g === "TP" || g === "FN";
    return {
      type: "scatter" as const,
      mode: "markers" as const,
      name: `${g} (${gpts.length})`,
      x: gpts.map(
        (p) => (p.predicted_functional ? 1 : 0) + jitterFor(p.position),
      ),
      y: gpts.map((p) => p.upper_neglog_p ?? 0),
      marker: {
        color: TP_CATEGORY_COLORS[g],
        size: 7,
        line: outline
          ? { color: "#171717", width: 1 }
          : { color: "rgba(0,0,0,0)", width: 0 },
      },
      hovertemplate: "%{text}<br>−log₁₀p: %{y:.2f}<extra></extra>",
      text: gpts.map(
        (p) => `chr${p.chrom}:${p.position.toLocaleString()} · ${g}`,
      ),
    };
  });
  return (
    <Plot
      data={traces}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: 360,
        margin: { l: 60, r: 20, t: 20, b: 60 },
        xaxis: {
          ...PLOTLY_AXIS,
          title: { text: "Predicted" },
          tickvals: [0, 1],
          ticktext: ["Not functional", "Functional"],
          range: [-0.6, 1.6],
        },
        yaxis: {
          ...PLOTLY_AXIS,
          title: { text: "−log₁₀(experimental p/q)" },
          rangemode: "tozero" as const,
        },
        shapes: [
          {
            type: "line" as const,
            y0: threshold,
            y1: threshold,
            x0: 0,
            x1: 1,
            xref: "paper" as const,
            line: { color: "#dc2626", dash: "dash" as const, width: 1 },
          },
        ],
        legend: {
          orientation: "h" as const,
          y: -0.2,
          xanchor: "center" as const,
          x: 0.5,
        },
        showlegend: true,
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Data Loading
// ============================================================================

type LoadStage =
  | "loading_data"
  | "fetching_urls"
  | "loading_enrichment"
  | "analyzing";

type IgvfLoadState =
  | { type: "idle" }
  | { type: "loading"; stage: LoadStage }
  | { type: "error"; message: string }
  | { type: "ready"; report: IgvfReportData };

function useIgvfData(
  cohortId: string,
  dataUrl: string,
  shareToken?: string | null,
) {
  const {
    query,
    loadParquet,
    isLoading: dbLoading,
    isReady,
    error: dbError,
  } = useDuckDB();
  const [state, setState] = useState<IgvfLoadState>({ type: "idle" });
  const loadStartedRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (!isReady) return;
    setState({ type: "loading", stage: "loading_data" });
    try {
      await loadParquet(dataUrl, "variants", `cohort:${cohortId}:data`);

      setState({ type: "loading", stage: "fetching_urls" });
      const files = await getCohortFiles(
        cohortId,
        undefined,
        shareToken ?? undefined,
      );

      setState({ type: "loading", stage: "loading_enrichment" });
      const loaded: Array<{ label: string; rows: number }> = [];
      for (const label of ENRICHMENT_LABELS) {
        const file = files.files.find(
          (f) => f.label === `${label}.parquet` || f.label === label,
        );
        if (file) {
          try {
            await loadParquet(file.url, label, `cohort:${cohortId}:${label}`);
            const r = await query(`SELECT count(*) as n FROM ${label}`);
            const cnt = r.rows[0]?.n;
            loaded.push({
              label,
              rows:
                typeof cnt === "number"
                  ? cnt
                  : typeof cnt === "bigint"
                    ? Number(cnt)
                    : 0,
            });
          } catch {
            await query(`CREATE TABLE IF NOT EXISTS ${label} (vid UBIGINT)`);
            loaded.push({ label, rows: 0 });
          }
        } else {
          await query(`CREATE TABLE IF NOT EXISTS ${label} (vid UBIGINT)`);
          loaded.push({ label, rows: 0 });
        }
      }

      setState({ type: "loading", stage: "analyzing" });
      const report = await generateIgvfReport(query, loaded);
      setState({ type: "ready", report });
    } catch (err) {
      console.error("[IGVF]", err);
      setState({
        type: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  }, [isReady, cohortId, dataUrl, shareToken, loadParquet, query]);

  useEffect(() => {
    if (isReady && !loadStartedRef.current) {
      loadStartedRef.current = true;
      loadAll();
    }
  }, [isReady, loadAll]);

  return {
    report: state.type === "ready" ? state.report : null,
    isLoading: dbLoading || state.type === "loading",
    stage:
      state.type === "loading" ? state.stage : ("loading_data" as LoadStage),
    error: dbError || (state.type === "error" ? state.message : null),
    retry: loadAll,
    query,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function IgvfLipidReport({
  cohortId,
  dataUrl,
  shareToken,
  className,
}: {
  cohortId: string;
  dataUrl: string;
  shareToken?: string | null;
  className?: string;
}) {
  const { report, isLoading, stage, error, retry, query } = useIgvfData(
    cohortId,
    dataUrl,
    shareToken,
  );
  const [selectedDataset, setSelectedDataset] = useState<DatasetId | null>(
    null,
  );
  const [variantFilter, setVariantFilter] = useState<VariantFilter | null>(
    null,
  );

  const activeDataset = selectedDataset ?? report?.availableDatasets[0] ?? null;

  if (isLoading) {
    const labels: Record<LoadStage, string> = {
      loading_data: "Loading FAVOR annotations…",
      fetching_urls: "Fetching enrichment files…",
      loading_enrichment: "Loading enrichment parquets…",
      analyzing: "Running analysis…",
    };
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-foreground">{labels[stage]}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-2">
          Analysis failed
        </p>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
        <Button variant="outline" onClick={retry}>
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!report || report.availableDatasets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-20">
        No experimental datasets with sufficient overlap found.
      </p>
    );
  }

  const activeReport = activeDataset ? report.reports[activeDataset] : null;
  const datasetLabels = report.availableDatasets.map((id) => {
    const def = DATASET_DEFS.find((d) => d.id === id);
    const r = report.reports[id];
    return {
      value: id,
      label: `${def?.label ?? id} (${(r?.variantCount ?? 0).toLocaleString()})`,
    };
  });

  return (
    <div
      className={cn("max-w-5xl mx-auto print:max-w-none space-y-10", className)}
    >
      {/* Export button — hidden in print */}
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-1.5" /> Export PDF
        </Button>
      </div>

      {/* Section 1: Cohort Overview */}
      <CohortOverview report={report} onFilterClick={setVariantFilter} />

      {/* Section 2: Per-Dataset Analysis */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 print:hidden">
          Per-Dataset Analysis
        </h2>
        {report.availableDatasets.length > 1 && activeDataset && (
          <div className="mb-6 print:hidden">
            <SegmentedControl
              value={activeDataset}
              onChange={setSelectedDataset}
              options={datasetLabels}
            />
          </div>
        )}
        {/* Screen: show active tab only. Print: show all datasets. */}
        <div className="print:hidden">
          {activeReport && (
            <DatasetReportView
              report={activeReport}
              onFilterClick={setVariantFilter}
            />
          )}
        </div>
        <div className="hidden print:block space-y-12">
          {report.availableDatasets.map((id) => {
            const r = report.reports[id];
            if (!r) return null;
            return <DatasetReportView key={id} report={r} />;
          })}
        </div>
      </div>

      {/* Section 3: Cross-Dataset Context */}
      <CrossDatasetContext
        data={report.crossDataset}
        onFilterClick={setVariantFilter}
      />

      <footer className="pt-4 mt-4 border-t border-border text-[10px] text-muted-foreground">
        IGVF Lipid Analysis &middot; {report.loadedTables?.length ?? 0}{" "}
        enrichment tables (
        {report.loadedTables?.filter((t) => t.rows > 0).length ?? 0} with data)
        &middot;
        {report.availableDatasets.length} dataset
        {report.availableDatasets.length > 1 ? "s" : ""} &middot; GRCh38/hg38
      </footer>

      {variantFilter && (
        <VariantDrawer
          filter={variantFilter}
          onClose={() => setVariantFilter(null)}
          query={query}
        />
      )}
    </div>
  );
}
