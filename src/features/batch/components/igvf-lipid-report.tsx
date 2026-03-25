"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  ForestPlot,
  ManhattanPlot,
  PRCurve,
  Plot,
  type ForestPlotRow,
  type ManhattanPoint,
  PLOTLY_FONT,
  PLOTLY_AXIS,
  PLOTLY_CONFIG_STATIC,
} from "@shared/components/ui/charts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCohortFiles } from "../api";
import { VariantDrawer } from "../components/variant-drawer";
import { useDuckDB } from "../hooks/use-duckdb";
import {
  DATASET_DEFS,
  generateIgvfReport,
  IGVF_BASELINE,
  type AfBoxplotRow,
  type CrossDatasetData,
  type DatasetId,
  type DatasetReport,
  type ForestRow,
  type IgvfReportData,
  type LogfcRow,
  type MiamiPoint,
  type SummaryRow,
  type UpsetRow,
  type VariantFilter,
} from "../lib/igvf-queries";

// ============================================================================
// Enrichment labels — all tables loaded from backend
// ============================================================================

const ENRICHMENT_LABELS = [
  "peaks", "gwas_ukb_ldl", "gwas_topmed_ldl", "ase", "coloc",
  "finemapped_glgc", "base_editing", "mpra", "chrombpnet_liver",
  "tland_liver", "cv2f", "ccre_overlap",
  "dhs_overlap_mgh", "dhs_overlap_unc",
  "finemapped_topmed", "finemapped_ukb",
  "mpra_oligos",
] as const;

// ============================================================================
// Color palettes for Miami modes
// ============================================================================

const EXONIC_COLORS: Record<string, string> = { Missense: "#ef4444", Synonymous: "#3b82f6", pLoF: "#171717" };
const CAGE_COLORS: Record<string, string> = { Promoter: "#f97316", Enhancer: "#06b6d4", Neither: "#a3a3a3" };
const ENCODE_ELEMENT_COLORS: Record<string, string> = {
  PLS: "#ef4444", pELS: "#f97316", dELS: "#eab308", "CTCF-only": "#22c55e", "DNase-H3K4me3": "#3b82f6", None: "#a3a3a3",
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

// ============================================================================
// Data transforms
// ============================================================================

function toForestData(rows: ForestRow[]): ForestPlotRow[] {
  // Filter out methods with 0 predictions (tp + fp = 0) — Haldane pseudocount creates artifact ORs
  return rows.filter((r) => r.tp + r.fp > 0).map((r) => ({ label: r.method, estimate: r.or, lo: r.orLo, hi: r.orHi }));
}
function toLogfcForest(rows: LogfcRow[]): ForestPlotRow[] {
  return rows.filter((r) => r.n >= 1).map((r) => ({ label: `${r.method}${r.n < 3 ? ` (n=${r.n})` : ""}`, estimate: r.meanZ, lo: r.lo, hi: r.hi }));
}
function toRecallForest(rows: ForestRow[]): ForestPlotRow[] {
  // Only show methods with at least 1 TP — 0/N recall is not informative
  return rows.filter((r) => r.tp > 0).map((r) => ({
    label: `${r.method}  ${r.tp}/${r.tp + r.fn}`, estimate: r.recall, lo: r.recallLo, hi: r.recallHi,
  }));
}
function toPrecisionForest(rows: ForestRow[]): ForestPlotRow[] {
  return rows.filter((r) => r.tp > 0).map((r) => ({
    label: `${r.method}  ${r.tp}/${r.tp + r.fp}`, estimate: r.precision, lo: r.precisionLo, hi: r.precisionHi,
  }));
}

type MiamiMode = "functional" | "exonic" | "cage" | "encode";

function toManhattan(points: MiamiPoint[], mode: MiamiMode): ManhattanPoint[] {
  let filtered = points.filter((pt) => pt.upper_neglog_p != null);
  if (mode === "exonic") filtered = filtered.filter((pt) => pt.variant_category === "Coding" && pt.exonic_category);
  if (mode === "cage" || mode === "encode") filtered = filtered.filter((pt) => pt.variant_category === "Noncoding");

  return filtered.map((pt) => {
    let color: string, group: string, symbol: string;
    switch (mode) {
      case "exonic": {
        const cat = pt.exonic_category ?? "Unknown";
        color = EXONIC_COLORS[cat] ?? "#737373"; group = cat;
        symbol = cat === "pLoF" ? "triangle-up" : cat === "Missense" ? "circle" : "square"; break;
      }
      case "cage": {
        color = CAGE_COLORS[pt.cage_category] ?? "#a3a3a3"; group = `CAGE ${pt.cage_category}`;
        symbol = pt.cage_category === "Promoter" ? "square" : pt.cage_category === "Enhancer" ? "triangle-up" : "circle"; break;
      }
      case "encode": {
        color = ENCODE_ELEMENT_COLORS[pt.encode_element] ?? "#a3a3a3"; group = pt.encode_element; symbol = "circle"; break;
      }
      default: {
        color = pt.predicted_functional ? "#eab308" : "#6b21a8";
        symbol = pt.encode_ccre === "Promoter" ? "square" : pt.encode_ccre === "Enhancer" ? "triangle-up" : "circle";
        const ccre = pt.encode_ccre === "None" ? "No cCRE" : pt.encode_ccre;
        group = `${ccre} · ${pt.predicted_functional ? "Func." : "Not func."}`;
        break;
      }
    }
    return { chrom: pt.chrom, position: pt.position, value: pt.upper_neglog_p!, color, symbol, group, significant: pt.is_sig,
      hoverText: `chr${pt.chrom}:${pt.position.toLocaleString()}\np=${Math.pow(10, -(pt.upper_neglog_p ?? 0)).toExponential(1)}` };
  });
}

// ============================================================================
// Reusable UI components
// ============================================================================

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return <div className="mb-3"><h3 className="text-sm font-semibold text-foreground">{children}</h3>
    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}</div>;
}

/** Clickable count — renders as a link if onClick + count > 0, else plain text */
function Clickable({ value, label, sql, onClick, className }: {
  value: number; label: string; sql: string;
  onClick?: (f: VariantFilter) => void; className?: string;
}) {
  if (!onClick || value === 0) return <span className={className}>{value.toLocaleString()}</span>;
  return <button onClick={() => onClick({ label, sql })}
    className={cn("text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 cursor-pointer", className)}>
    {value.toLocaleString()}</button>;
}

function SegmentedControl<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>;
}) {
  return <div className="inline-flex items-center p-0.5 bg-muted rounded-lg">
    {options.map((opt) => <button key={opt.value} onClick={() => onChange(opt.value)}
      className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors",
        value === opt.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{opt.label}</button>)}
  </div>;
}

/** Maps SummaryRow column keys → SQL filter functions (given sig column) */
const COL_FILTER_SQL: Record<string, (sig: string) => string> = {
  total: () => "TRUE", expSig: (s) => s, predFunc: () => "pred_overall",
  predSig: (s) => `pred_overall AND ${s}`,
  apc: () => "pred_apc", chrombpnet: () => "pred_chrombpnet", clinvar: () => "pred_clinvar",
  liver_cv2f: () => "pred_liver_cv2f", cv2f: () => "pred_cv2f",
  liver_ase: () => "pred_liver_ase", ase: () => "pred_ase", tland: () => "pred_liver_tland",
};

// ============================================================================
// Summary Table
// ============================================================================

/** Map a SummaryRow column key → baseline rates key */
const COL_TO_BASELINE: Record<string, string> = {
  predFunc: "pred_overall", apc: "pred_apc", chrombpnet: "pred_chrombpnet",
  clinvar: "pred_clinvar", liver_cv2f: "pred_liver_cv2f", cv2f: "pred_cv2f",
  liver_ase: "pred_liver_ase", ase: "pred_ase", tland: "pred_liver_tland",
};

function SummaryTable({ data, title, showBaseline, onFilterClick, filterCtx }: {
  data: SummaryRow[]; title?: string; showBaseline?: boolean;
  onFilterClick?: (f: VariantFilter) => void;
  filterCtx?: { baseWhere: string; sigColumn: string; categoryColumn: string };
}) {
  if (data.length === 0) return null;
  const cols: Array<{ k: keyof SummaryRow; l: string; fmt?: "float" }> = [
    { k: "category", l: "" }, { k: "total", l: "n" }, { k: "expSig", l: "Exp.Sig" }, { k: "predFunc", l: "Pred.Func" }, { k: "predSig", l: "Pred+Sig" },
    { k: "apc", l: "aPC" }, { k: "chrombpnet", l: "CBPNet" }, { k: "clinvar", l: "ClinVar" },
    { k: "liver_cv2f", l: "lv cV2F" }, { k: "cv2f", l: "cV2F" },
    { k: "liver_ase", l: "lv ASE" }, { k: "ase", l: "ASE" }, { k: "tland", l: "TLand" },
    { k: "meanDnase", l: "DNase̅", fmt: "float" }, { k: "meanH3k27ac", l: "H3K27ac̅", fmt: "float" }, { k: "meanH3k4me3", l: "H3K4me3̅", fmt: "float" },
  ];
  // Hide method columns that are all zero — they add noise. Show footnote.
  const methodKeys = ["apc", "chrombpnet", "clinvar", "liver_cv2f", "cv2f", "liver_ase", "ase", "tland"];
  const zeroMethods = methodKeys.filter((k) => !data.some((r) => (r[k as keyof SummaryRow] as number) > 0));
  const activeCols = zeroMethods.length > 0
    ? cols.filter((c) => !zeroMethods.includes(c.k))
    : cols;
  const numKeys = activeCols.filter((c) => c.k !== "category");

  const totals = { ...data.reduce((acc, r) => {
    for (const c of numKeys) {
      const k = c.k as keyof SummaryRow;
      if (c.fmt === "float") continue;
      (acc as Record<string, number>)[k as string] = ((acc as Record<string, number>)[k as string] ?? 0) + (r[k] as number ?? 0);
    }
    return acc;
  }, {} as Record<string, number>), category: "All" } as SummaryRow;
  for (const c of numKeys.filter((c) => c.fmt === "float")) {
    let sw = 0, sv = 0;
    for (const r of data) { const v = r[c.k as keyof SummaryRow] as number | null; if (v != null) { sw += r.total; sv += v * r.total; } }
    (totals as unknown as Record<string, number | null>)[c.k] = sw > 0 ? sv / sw : null;
  }

  const renderRow = (row: SummaryRow, className?: string, isTotals?: boolean) =>
    <tr key={row.category} className={cn("border-b border-border/50", className)}>
      <td className="py-1.5 px-2 text-foreground">{row.category}</td>
      {numKeys.map((col) => {
        const v = row[col.k as keyof SummaryRow];
        const display = col.fmt === "float" ? (v != null ? (v as number).toFixed(1) : "—") : String(v ?? 0);
        const filterFn = onFilterClick && filterCtx && !col.fmt ? COL_FILTER_SQL[col.k] : null;
        const canClick = filterFn && typeof v === "number" && v > 0;
        return <td key={col.k} className={cn("py-1.5 px-2 text-right tabular-nums", v == null || v === 0 ? "text-muted-foreground/30" : "text-foreground")}>
          {canClick ? <button onClick={() => {
            const colCond = filterFn(filterCtx!.sigColumn);
            const catCond = isTotals ? "" : `${filterCtx!.categoryColumn} = '${row.category}'`;
            onFilterClick!({ label: `${isTotals ? "All" : row.category} — ${col.l}`, sql: [filterCtx!.baseWhere, catCond, colCond].filter(Boolean).join(" AND ") });
          }} className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 cursor-pointer" title={`View ${display} variants`}>{display}</button> : display}
        </td>;
      })}
    </tr>;

  return <div>{title && <SectionTitle>{title}</SectionTitle>}
    <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead><tr className="border-b border-border">{activeCols.map((h) =>
        <th key={h.k} className={cn("py-2 px-2 text-muted-foreground font-medium", h.k === "category" ? "text-left" : "text-right")}>{h.l}</th>
      )}</tr></thead>
      <tbody>
        {data.map((row) => renderRow(row))}
        {renderRow(totals, "font-semibold bg-muted/30", true)}
        {showBaseline && <tr className="border-t-2 border-border bg-primary/5 text-[11px]">
          <td className="py-1.5 px-2 text-muted-foreground italic">10M Baseline</td>
          {numKeys.map((col) => {
            const bk = COL_TO_BASELINE[col.k];
            const b = bk ? IGVF_BASELINE.rates[bk] : null;
            if (col.k === "total") return <td key={col.k} className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{(IGVF_BASELINE.totalVariants / 1e6).toFixed(1)}M</td>;
            if (!b || col.fmt === "float" || col.k === "expSig" || col.k === "predSig") return <td key={col.k} className="py-1.5 px-2 text-right text-muted-foreground/30">—</td>;
            return <td key={col.k} className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{fmtPct(b.rate)}</td>;
          })}
        </tr>}
      </tbody>
    </table></div>
    {zeroMethods.length > 0 && <p className="text-[10px] text-muted-foreground mt-1.5">
      No predictions in this cohort: {zeroMethods.map((k) => cols.find((c) => c.k === k)?.l ?? k).join(", ")}
    </p>}
  </div>;
}

// ============================================================================
// UpSet Plot
// ============================================================================

const UPSET_METHODS_ALL = [
  { key: "pred_apc" as const, label: "aPC" }, { key: "pred_chrombpnet" as const, label: "chromBPnet" },
  { key: "pred_clinvar" as const, label: "ClinVar" },
  { key: "pred_liver_cv2f" as const, label: "liver cV2F" }, { key: "pred_cv2f" as const, label: "cV2F" },
  { key: "pred_liver_ase" as const, label: "liver ASE" }, { key: "pred_ase" as const, label: "ASE" },
  { key: "pred_liver_tland" as const, label: "liver TLand" },
];

function SvgTip({ content, children }: { content: string; children: React.ReactElement }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent className="font-mono text-xs whitespace-pre">{content}</TooltipContent></Tooltip>;
}

function UpsetPlot({ data, methods: allMethods, onFilterClick, baseWhere }: {
  data: UpsetRow[]; methods: typeof UPSET_METHODS_ALL;
  onFilterClick?: (f: VariantFilter) => void; baseWhere?: string;
}) {
  // Auto-filter to methods that have at least 1 positive prediction
  const methods = useMemo(() =>
    allMethods.filter((m) => data.some((d) => d[m.key as keyof UpsetRow])),
    [allMethods, data],
  );
  const active = useMemo(() =>
    data.filter((d) => methods.some((m) => d[m.key as keyof UpsetRow])).sort((a, b) => b.count - a.count).slice(0, 25),
    [data, methods],
  );
  if (active.length < 2 || methods.length === 0) return <p className="text-xs text-muted-foreground py-6 text-center">Not enough intersections to display.</p>;

  const setSizes = methods.map((m) => ({ ...m, size: data.reduce((s, d) => s + (d[m.key as keyof UpsetRow] ? d.count : 0), 0) }));
  const nM = methods.length, nC = active.length;
  const colW = 44, rowH = 32, barMaxH = 140, setBarMaxW = 120, dotR = 7;
  const labelW = 100, countW = 36;
  const padL = labelW + countW + setBarMaxW + 16, padT = barMaxH + 32;
  const W = padL + nC * colW + 32, H = padT + nM * rowH + 20;
  const maxCount = Math.max(...active.map((d) => d.count), 1);
  const maxSet = Math.max(...setSizes.map((s) => s.size), 1);

  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: Math.min(W, 960) }}>
    <line x1={padL - 10} y1={padT - barMaxH - 16} x2={padL - 10} y2={H - 8} stroke="currentColor" strokeWidth={1} opacity={0.1} />
    <line x1={padL - 10} y1={padT} x2={W - 8} y2={padT} stroke="currentColor" strokeWidth={1} opacity={0.1} />
    <text x={padL + (nC * colW) / 2} y={16} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: "#737373" }}>Intersection Size</text>
    {setSizes.map((s, i) => {
      const barW = Math.max(1, (s.size / maxSet) * setBarMaxW);
      const cy = padT + i * rowH + rowH / 2;
      return <g key={s.key}>
        <text x={labelW - 4} y={cy + 5} textAnchor="end" fontSize={12} fontWeight={500} style={{ fill: "#171717" }}>{s.label}</text>
        <text x={labelW + countW - 4} y={cy + 4} textAnchor="end" fontSize={11} fontWeight={500} style={{ fill: "#737373" }}>{s.size}</text>
        <rect x={labelW + countW + setBarMaxW - barW + 4} y={cy - 8} width={barW} height={16} rx={3} fill="#7c3aed" opacity={0.2} />
      </g>;
    })}
    {methods.map((_, i) => <line key={i} x1={padL - 10} y1={padT + i * rowH + rowH / 2} x2={W - 8} y2={padT + i * rowH + rowH / 2} stroke="currentColor" strokeWidth={0.5} opacity={0.05} />)}
    {active.map((inter, ci) => {
      const cx = padL + ci * colW + colW / 2;
      const barH = Math.max(2, (inter.count / maxCount) * barMaxH);
      const indices = methods.map((m, i) => inter[m.key as keyof UpsetRow] ? i : -1).filter((i) => i >= 0);
      const sigPct = inter.count > 0 ? Math.round(100 * inter.expSigCount / inter.count) : 0;
      return <SvgTip key={ci} content={`${inter.count} variants\n${inter.expSigCount} exp. significant (${sigPct}%)${onFilterClick ? "\nClick to view" : ""}`}>
        <g style={{ cursor: onFilterClick ? "pointer" : "default" }}
          onClick={onFilterClick ? () => {
            const conds = allMethods.map((m) => `${m.key} = ${inter[m.key as keyof UpsetRow] ? "true" : "false"}`);
            const activeLabels = methods.filter((m) => inter[m.key as keyof UpsetRow]).map((m) => m.label);
            onFilterClick({ label: `${inter.count} variants: ${activeLabels.join(" ∩ ")}`, sql: [baseWhere, ...conds].filter(Boolean).join(" AND ") });
          } : undefined}>
          <rect x={cx - 12} y={padT - barH - 4} width={24} height={barH} rx={4} fill="#7c3aed" opacity={0.85} />
          {inter.expSigCount > 0 && <rect x={cx - 12} y={padT - (inter.expSigCount / maxCount) * barMaxH - 4}
            width={24} height={Math.max(2, (inter.expSigCount / maxCount) * barMaxH)} rx={4} fill="#059669" opacity={0.6} />}
          <text x={cx} y={padT - barH - 10} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: "#171717" }}>{inter.count}</text>
          {methods.map((m, mi) => <circle key={m.key} cx={cx} cy={padT + mi * rowH + rowH / 2} r={dotR}
            fill={inter[m.key as keyof UpsetRow] ? "#171717" : "none"} stroke={inter[m.key as keyof UpsetRow] ? "#171717" : "#d4d4d4"} strokeWidth={inter[m.key as keyof UpsetRow] ? 0 : 1.5} />)}
          {indices.length > 1 && <line x1={cx} y1={padT + Math.min(...indices) * rowH + rowH / 2}
            x2={cx} y2={padT + Math.max(...indices) * rowH + rowH / 2} stroke="#171717" strokeWidth={2.5} strokeLinecap="round" />}
        </g>
      </SvgTip>;
    })}
    <g transform={`translate(${W - 160}, ${padT - barMaxH - 8})`}>
      <rect x={0} y={0} width={12} height={12} rx={2} fill="#7c3aed" opacity={0.85} />
      <text x={16} y={10} fontSize={10} style={{ fill: "#737373" }}>Total</text>
      <rect x={0} y={18} width={12} height={12} rx={2} fill="#059669" opacity={0.6} />
      <text x={16} y={28} fontSize={10} style={{ fill: "#737373" }}>Exp. Significant</text>
    </g>
  </svg>;
}

// ============================================================================
// AF Boxplot
// ============================================================================

function AfBoxplot({ data }: { data: AfBoxplotRow[] }) {
  if (data.length === 0) return null;
  const groups = useMemo(() => [...new Set(data.map((r) => r.sigGroup))].sort(), [data]);
  const traces = useMemo(() => {
    return groups.map((grp, gi) => {
      const rows = data.filter((r) => r.sigGroup === grp);
      return { type: "box" as const, name: grp, x: rows.map((r) => r.population),
        lowerfence: rows.map((r) => r.p5), q1: rows.map((r) => r.q1), median: rows.map((r) => r.median),
        q3: rows.map((r) => r.q3), upperfence: rows.map((r) => r.p95),
        marker: { color: gi === 0 ? "#d4d4d4" : "#7c3aed" }, line: { color: gi === 0 ? "#d4d4d4" : "#7c3aed" },
        fillcolor: gi === 0 ? "rgba(212,212,212,0.3)" : "rgba(124,58,237,0.2)",
        hovertemplate: `${grp}<br>%{x}<br>Median: %{median:.2e}<extra></extra>` };
    });
  }, [data, groups]);
  return <Plot data={traces} layout={{ font: PLOTLY_FONT, paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    height: 350, margin: { l: 60, r: 20, t: 20, b: 50 },
    xaxis: { ...PLOTLY_AXIS, title: { text: "Population" } }, yaxis: { ...PLOTLY_AXIS, title: { text: "Allele Frequency" }, type: "log" },
    boxmode: "group" as const, legend: { x: 1.02, y: 1, xanchor: "left" as const }, showlegend: true }}
    config={PLOTLY_CONFIG_STATIC} style={{ width: "100%" }} />;
}

// ============================================================================
// Gene Zoom
// ============================================================================

const GENE_ZOOM_COLORS: Record<string, string> = {
  TP: "#eab308", FP: "#fde68a", FN: "#7c3aed", TN: "#d4d4d4",
};

function GeneZoom({ miami, gene }: { miami: MiamiPoint[]; gene: string }) {
  const pts = useMemo(() => miami.filter((pt) => pt.genes.includes(gene) && pt.upper_neglog_p != null), [miami, gene]);
  if (pts.length === 0) return <p className="text-xs text-muted-foreground">No variants for {gene}</p>;
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
  const sizes = pts.map((p) => p.is_sig ? 10 : 6);
  const outlines = pts.map((p) => p.is_sig ? "#171717" : "rgba(0,0,0,0)");
  return <div>
    <Plot data={[{ type: "scatter" as const, mode: "markers" as const,
      x: pts.map((p) => p.position), y: pts.map((p) => p.upper_neglog_p!),
      marker: { color: colors, size: sizes, line: { color: outlines, width: 1.5 } },
      hovertemplate: "chr%{text}<br>−log₁₀p: %{y:.1f}<extra></extra>",
      text: pts.map((p) => `${p.chrom}:${p.position.toLocaleString()}`) }]}
      layout={{ font: PLOTLY_FONT, paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        title: { text: `${gene} ± ${Math.round(pad / 1000)}kb`, font: { ...PLOTLY_FONT, size: 13 }, x: 0, xanchor: "left" as const },
        height: 250, margin: { l: 50, r: 20, t: 40, b: 55 },
        xaxis: { ...PLOTLY_AXIS, title: { text: "Position" }, range: [minPos - pad, maxPos + pad] },
        yaxis: { ...PLOTLY_AXIS, title: { text: "−log₁₀(p)" }, rangemode: "tozero" as const },
        shapes: [{ type: "line" as const, x0: minPos - pad, x1: maxPos + pad, y0: -Math.log10(0.05), y1: -Math.log10(0.05), line: { color: "#3b82f6", width: 1, dash: "dash" as const } }] }}
      config={PLOTLY_CONFIG_STATIC} style={{ width: "100%" }} />
    <div className="flex items-center gap-4 justify-center text-[10px] text-muted-foreground mt-4">
      {([["TP", "Func + Sig"], ["FP", "Func + Not sig"], ["FN", "Not func + Sig"], ["TN", "Not func + Not sig"]] as const).map(([key, label]) =>
        <span key={key} className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENE_ZOOM_COLORS[key], border: key === "TP" || key === "FN" ? "1.5px solid #171717" : "none" }} />
          {label}
        </span>
      )}
    </div>
  </div>;
}

// ============================================================================
// Dataset Report View (renders one dataset's full analysis)
// ============================================================================

function DatasetReportView({ report: dr, totalVariants, onFilterClick }: {
  report: DatasetReport; totalVariants: number;
  onFilterClick?: (f: VariantFilter) => void;
}) {
  const [miamiMode, setMiamiMode] = useState<MiamiMode>("functional");
  const [upsetMode, setUpsetMode] = useState<"all" | "coding" | "noncoding" | "sig">("all");
  const [selectedGene, setSelectedGene] = useState<string | null>(null);

  const datasetWhere = dr.dataset.mode === "within" ? dr.dataset.presenceColumn : "";
  const sigColumn = dr.dataset.mode === "within" ? dr.dataset.sigColumn : dr.dataset.presenceColumn;

  const marginalData = useMemo(() => toForestData(dr.forest), [dr.forest]);
  const jointData = useMemo(() => {
    if (!dr.jointForest) return null;
    // Filter out zero-variance methods (OR=1, CI=[1,1]) from joint model display
    const filtered = dr.jointForest.filter((r) => !(r.or === 1 && r.orLo === 1 && r.orHi === 1));
    return filtered.length > 0 ? filtered.map((r) => ({ label: r.method, estimate: r.or, lo: r.orLo, hi: r.orHi })) : null;
  }, [dr.jointForest]);
  const logfcData = useMemo(() => toLogfcForest(dr.logfc), [dr.logfc]);
  const recallData = useMemo(() => toRecallForest(dr.forest), [dr.forest]);
  const precisionData = useMemo(() => toPrecisionForest(dr.forest), [dr.forest]);
  const manhattanData = useMemo(() => toManhattan(dr.miami, miamiMode), [dr.miami, miamiMode]);

  const upsetData = useMemo(() => {
    switch (upsetMode) {
      case "coding": return dr.upsetCoding;
      case "noncoding": return dr.upsetNoncoding;
      case "sig": return dr.upsetSigOnly;
      default: return dr.upset;
    }
  }, [dr, upsetMode]);

  const hasMiami = dr.miami.length > 0 && dr.dataset.pvalColumns;

  // Auto-generated narrative
  const narrative = useMemo(() => {
    const sigPct = dr.variantCount > 0 ? (dr.sigCount / dr.variantCount * 100).toFixed(1) : "0";
    const activeMethods = dr.forest.filter((r) => r.tp + r.fp > 0 && r.method !== "Overall");
    const best = activeMethods.length > 0
      ? [...activeMethods].sort((a, b) => b.or - a.or)[0]
      : null;
    const sigMethods = activeMethods.filter((r) => r.significant);
    const nonSig = activeMethods.filter((r) => !r.significant).map((r) => r.method);

    let text = `Of ${dr.variantCount.toLocaleString()} ${dr.dataset.label} variants, ${dr.sigCount} (${sigPct}%) are experimentally significant.`;
    if (best) {
      text += ` ${best.method} is the strongest marginal predictor (OR ${best.or.toFixed(1)}, 95% CI ${best.orLo.toFixed(1)}–${best.orHi.toFixed(1)}) capturing ${best.tp} of ${dr.sigCount} significant variants.`;
    }
    if (dr.jointForest) {
      const jointActive = dr.jointForest.filter((r) => !(r.or === 1 && r.orLo === 1 && r.orHi === 1) && r.significant);
      if (jointActive.length > 0) {
        text += ` In the joint model, ${jointActive.map((r) => r.method).join(" and ")} retain${jointActive.length === 1 ? "s" : ""} independent predictive value.`;
      }
    }
    if (nonSig.length > 0 && nonSig.length <= 4) {
      text += ` ${nonSig.join(", ")} do${nonSig.length === 1 ? "es" : ""} not reach significance in this cohort.`;
    }
    return text;
  }, [dr]);

  return <div className="space-y-8">
    {/* Narrative summary */}
    <p className="text-sm text-muted-foreground leading-relaxed">{narrative}</p>

    {/* 1. Summary Tables — orient the user first */}
    {dr.summary.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SummaryTable data={dr.summary} title="Variant Summary by Category" showBaseline
        onFilterClick={onFilterClick} filterCtx={{ baseWhere: datasetWhere, sigColumn, categoryColumn: "variant_category" }} />
      {dr.summaryCage.length > 0 && <div className="mt-6">
        <SummaryTable data={dr.summaryCage} title="Noncoding by CAGE Category"
          onFilterClick={onFilterClick} filterCtx={{ baseWhere: datasetWhere ? `${datasetWhere} AND variant_category = 'Noncoding'` : "variant_category = 'Noncoding'", sigColumn, categoryColumn: "cage_category" }} />
      </div>}
    </section>}

    {/* 2. Marginal Model — univariate ORs */}
    {marginalData.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle={`${dr.dataset.sigDescription}. Each method tested independently (2×2 table).`}>
        Marginal Model — {dr.dataset.label}
      </SectionTitle>
      <ForestPlot data={marginalData} title={`${dr.dataset.label} (${dr.sigCount} significant of ${dr.variantCount})`}
        xLabel="Marginal OR (95% CI)" />
    </section>}

    {/* 3. Joint Model — multivariate logistic regression */}
    {jointData && jointData.length > 0 && (() => {
      const excluded = dr.jointForest?.filter((r) => r.or === 1 && r.orLo === 1 && r.orHi === 1).map((r) => r.method) ?? [];
      return <section className="rounded-lg border border-border bg-card p-4">
        <SectionTitle subtitle="Ridge-regularized logistic regression. Shows independent predictive value when controlling for all other methods.">
          Joint Model — {dr.dataset.label}
        </SectionTitle>
        <ForestPlot data={jointData} title={`${dr.dataset.label} (${dr.sigCount} significant of ${dr.variantCount})`}
          xLabel="Joint OR (95% CI)" />
        {excluded.length > 0 && <p className="text-[10px] text-muted-foreground mt-2">
          Excluded (fewer than 3 predicted variants): {excluded.join(", ")}
        </p>}
      </section>;
    })()}

    {/* logFC Forest (base editing only) */}
    {logfcData.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Mean Z-score among variants predicted functional by each method. Negative Z = reduced LDL efflux (expected direction for functional variants).">Mean Z-score by Method</SectionTitle>
      <ForestPlot data={logfcData} title="Efflux Z-score" xLabel="Mean Z-score (95% CI)" refLine={0} logX={false} />
    </section>}

    {/* 4. Recall + Precision bar charts */}
    {recallData.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle={`Recall (sensitivity) — proportion of ${dr.sigCount} significant variants captured by each method. Wilson 95% CIs.`}>
        Recall — {dr.dataset.label}
      </SectionTitle>
      <ForestPlot data={recallData} title={`Recall (${dr.sigCount} sig.)`}
        xLabel="Recall (95% CI)" logX={false} refLine={null} />
    </section>}
    {precisionData.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Precision (PPV) — proportion of predicted-functional variants that are experimentally significant. Wilson 95% CIs.">
        Precision — {dr.dataset.label}
      </SectionTitle>
      <ForestPlot data={precisionData} title={`Precision (${dr.sigCount} sig.)`}
        xLabel="Precision (95% CI)" logX={false} refLine={null} />
    </section>}

    {/* 5. PR Curves */}
    {dr.prCurves.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Threshold sweep on continuous annotation scores. Methods with only binary flags appear as single points.">
        Precision-Recall Curves
      </SectionTitle>
      <PRCurve data={dr.prCurves} />
    </section>}

    {/* 6. Manhattan / locus plot */}
    {hasMiami && <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle subtitle="Genomic positions colored by annotation category.">{dr.dataset.label} — Locus Plot</SectionTitle>
        <SegmentedControl value={miamiMode} onChange={setMiamiMode} options={[
          { value: "functional", label: "Pred. Functional" }, { value: "exonic", label: "Exonic" },
          { value: "cage", label: "CAGE" }, { value: "encode", label: "ENCODE" }]} />
      </div>
      {manhattanData.length > 0
        ? <ManhattanPlot data={manhattanData} yLabel="−log₁₀(p-value)" threshold={-Math.log10(0.05)} />
        : <p className="text-xs text-muted-foreground py-8 text-center">No variants in this mode.</p>}
    </section>}

    {/* 7. UpSet plot */}
    {dr.upset.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle subtitle="Method intersection matrix with experimental significance overlay.">Method Overlap (UpSet)</SectionTitle>
        <SegmentedControl value={upsetMode} onChange={setUpsetMode} options={[
          { value: "all", label: "All" }, { value: "coding", label: "Coding" },
          { value: "noncoding", label: "Noncoding" }, { value: "sig", label: "Sig. Only" }]} />
      </div>
      <UpsetPlot data={upsetData} methods={UPSET_METHODS_ALL} onFilterClick={onFilterClick} baseWhere={datasetWhere} />
    </section>}

    {/* 8. Per-gene zoom */}
    {dr.geneList.length > 0 && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Select a gene to zoom into its region.">Per-Gene Zoom</SectionTitle>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {dr.geneList.map((gene) => <button key={gene} onClick={() => setSelectedGene(selectedGene === gene ? null : gene)}
          className={cn("px-2.5 py-1 text-xs rounded-md transition-colors border",
            selectedGene === gene ? "bg-primary/10 text-foreground border-primary/30 font-medium" : "text-muted-foreground border-border hover:bg-accent hover:text-foreground")}>{gene}</button>)}
      </div>
      {selectedGene && <GeneZoom miami={dr.miami} gene={selectedGene} />}
      {selectedGene && onFilterClick && (
        <button onClick={() => onFilterClick({
          label: `Variants in ${selectedGene}`,
          sql: [datasetWhere, `list_contains(genes, '${selectedGene}')`].filter(Boolean).join(" AND "),
        })} className="text-xs text-primary hover:text-primary/80 underline decoration-primary/30 mt-2 block">
          View all variants in {selectedGene} →
        </button>
      )}
    </section>}
  </div>;
}

// ============================================================================
// Section 1: Cohort Overview
// ============================================================================

function CohortOverview({ report, onFilterClick }: { report: IgvfReportData; onFilterClick?: (f: VariantFilter) => void }) {
  const loaded = report.loadedTables.filter((t) => t.rows > 0);
  return <section className="rounded-lg border border-border bg-card p-4 space-y-4">
    <SectionTitle subtitle="Which experimental datasets overlap and how many variants each.">Cohort Overview</SectionTitle>

    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        {onFilterClick ? <button onClick={() => onFilterClick({ label: "All variants", sql: "TRUE" })}
          className="text-2xl font-semibold text-primary hover:text-primary/80 tabular-nums underline decoration-primary/30 cursor-pointer">{report.totalVariants.toLocaleString()}</button>
          : <p className="text-2xl font-semibold text-foreground tabular-nums">{report.totalVariants.toLocaleString()}</p>}
        <p className="text-xs text-muted-foreground">Total variants (resolved)</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{report.availableDatasets.length}</p>
        <p className="text-xs text-muted-foreground">Experimental datasets</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{loaded.length}</p>
        <p className="text-xs text-muted-foreground">Enrichment sources loaded</p>
      </div>
    </div>

    {/* Dataset overlap */}
    <div>
      <p className="text-xs font-medium text-foreground mb-2">Experimental Dataset Overlap</p>
      <div className="space-y-1.5">
        {DATASET_DEFS.map((def) => {
          const r = report.reports[def.id];
          // enrichment mode: sigCount IS the overlap (finemapped count), variantCount is full cohort
          const n = def.mode === "enrichment" ? (r?.sigCount ?? 0) : (r?.variantCount ?? 0);
          const pct = report.totalVariants > 0 ? (n / report.totalVariants * 100).toFixed(1) : "0";
          return <div key={def.id} className="flex items-center gap-3 text-xs">
            <span className={cn("w-2 h-2 rounded-full", n > 0 ? "bg-primary" : "bg-muted")} />
            <span className={cn("w-32", n > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{def.label}</span>
            {n > 0 && onFilterClick ? <button onClick={() => onFilterClick({ label: `${def.label} variants`, sql: def.presenceColumn })}
              className="text-primary hover:text-primary/80 tabular-nums underline decoration-primary/30 cursor-pointer text-xs">{n.toLocaleString()} ({pct}%)</button>
              : <span className="text-muted-foreground tabular-nums">{n > 0 ? `${n.toLocaleString()} (${pct}%)` : "No overlap"}</span>}
          </div>;
        })}
      </div>
    </div>

    {/* Loaded tables */}
    <div>
      <p className="text-xs font-medium text-foreground mb-2">Enrichment Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {report.loadedTables.map((t) =>
          <span key={t.label} className={cn("px-2 py-0.5 text-[11px] rounded-md border",
            t.rows > 0 ? "border-primary/20 bg-primary/5 text-foreground" : "border-border text-muted-foreground/50")}>
            {t.label} {t.rows > 0 && <span className="text-muted-foreground ml-1">({t.rows.toLocaleString()})</span>}
          </span>
        )}
      </div>
    </div>
  </section>;
}

// ============================================================================
// Section 3: Cross-Dataset Context
// ============================================================================

function CrossDatasetContext({ data, onFilterClick }: { data: CrossDatasetData; onFilterClick?: (f: VariantFilter) => void }) {
  const hasDhs = data.dhsSummary.some((d) => d.promoterCount > 0 || d.enhancerCount > 0);
  const hasGwas = data.gwasContext.some((g) => g.total > 0);
  const hasColoc = data.colocSummary && data.colocSummary.totalVariants > 0;
  const hasFinemap = data.finemapSummary.length > 0;
  const hasAf = data.afBoxplot.length > 0;
  const hasBaseline = data.baselineRates && data.baselineRates.length > 0;

  if (!hasDhs && !hasGwas && !hasColoc && !hasFinemap && !hasAf && !hasBaseline) return null;

  return <div className="space-y-8">
    <h2 className="text-base font-semibold text-foreground pt-2">Cross-Dataset Context</h2>

    {/* AF Boxplot */}
    {hasAf && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="gnomAD genome AF by population, grouped by predicted functional status.">Allele Frequency by Population</SectionTitle>
      <AfBoxplot data={data.afBoxplot} />
    </section>}

    {/* DHS Overlap */}
    {hasDhs && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Promoter and enhancer linked genes from DHS overlap analysis.">DHS Overlap Summary</SectionTitle>
      <div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="border-b border-border">
          <th className="py-2 px-2 text-left text-muted-foreground font-medium">Source</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Promoter Variants</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Enhancer Variants</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Linked Promoter Genes</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Linked Enhancer Genes</th>
        </tr></thead>
        <tbody>{data.dhsSummary.map((d) => {
          const tbl = d.source === "MGH" ? "dhs_overlap_mgh" : "dhs_overlap_unc";
          return <tr key={d.source} className="border-b border-border/50">
            <td className="py-1.5 px-2 text-foreground font-medium">{d.source}</td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={d.promoterCount} label={`${d.source} DHS Promoter variants`}
              sql={`vid IN (SELECT vid FROM ${tbl} WHERE DHS_promoter = 1)`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={d.enhancerCount} label={`${d.source} DHS Enhancer variants`}
              sql={`vid IN (SELECT vid FROM ${tbl} WHERE DHS_enhancer = 1)`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{d.promoterGenes}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{d.enhancerGenes}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>}

    {/* GWAS Context */}
    {hasGwas && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="UKB and TOPMed LDL GWAS p-values for cohort variants.">GWAS Context</SectionTitle>
      <div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="border-b border-border">
          <th className="py-2 px-2 text-left text-muted-foreground font-medium">Study</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Variants</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Genome-wide (p&lt;5e-8)</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Nominal (p&lt;0.05)</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Min p-value</th>
        </tr></thead>
        <tbody>{data.gwasContext.map((g) => {
          const tbl = g.source === "UKB LDL" ? "gwas_ukb_ldl" : "gwas_topmed_ldl";
          return <tr key={g.source} className="border-b border-border/50">
            <td className="py-1.5 px-2 text-foreground font-medium">{g.source}</td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={g.total} label={`${g.source} — all variants`}
              sql={`vid IN (SELECT vid FROM ${tbl})`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={g.genomeWideSig} label={`${g.source} — genome-wide significant`}
              sql={`vid IN (SELECT vid FROM ${tbl} WHERE pvalue < 5e-8)`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={g.nominalSig} label={`${g.source} — nominal significant`}
              sql={`vid IN (SELECT vid FROM ${tbl} WHERE pvalue < 0.05)`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground whitespace-nowrap">{g.minP < 1 ? g.minP.toExponential(1) : "—"}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>}

    {/* Colocalization */}
    {hasColoc && data.colocSummary && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="Trait-tissue colocalization evidence for cohort variants.">Colocalization Summary</SectionTitle>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <Clickable value={data.colocSummary.totalVariants} label="Variants with colocalization"
            sql="vid IN (SELECT vid FROM coloc)" onClick={onFilterClick}
            className="text-lg font-semibold tabular-nums" />
          <p className="text-xs text-muted-foreground">Variants with coloc</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground tabular-nums">{data.colocSummary.totalColocs.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total colocalizations</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground tabular-nums">{data.colocSummary.totalTraits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Traits</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground tabular-nums">{data.colocSummary.avgMaxVcp.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground">Mean max VCP</p>
        </div>
      </div>
    </section>}

    {/* Finemapping Evidence */}
    {hasFinemap && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle="TOPMed multi-ancestry finemapping scores for cohort variants.">Finemapping Evidence</SectionTitle>
      <div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="border-b border-border">
          <th className="py-2 px-2 text-left text-muted-foreground font-medium">Trait</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Variants</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">UKB FINEMAP</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">UKB SuSiE</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">BBJ FINEMAP</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">BBJ SuSiE</th>
        </tr></thead>
        <tbody>{data.finemapSummary.map((f) =>
          <tr key={f.trait} className="border-b border-border/50">
            <td className="py-1.5 px-2 text-foreground font-medium">{f.trait}</td>
            <td className="py-1.5 px-2 text-right tabular-nums"><Clickable value={f.n} label={`Finemapped — ${f.trait}`}
              sql={`vid IN (SELECT vid FROM finemapped_topmed WHERE trait = '${f.trait}')`} onClick={onFilterClick} /></td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{f.avgUkbFinemap?.toFixed(4) ?? "—"}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{f.avgUkbSusie?.toFixed(4) ?? "—"}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{f.avgBbjFinemap?.toFixed(4) ?? "—"}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{f.avgBbjSusie?.toFixed(4) ?? "—"}</td>
          </tr>
        )}</tbody>
      </table></div>
    </section>}

    {/* Baseline Rates */}
    {hasBaseline && data.baselineRates && <section className="rounded-lg border border-border bg-card p-4">
      <SectionTitle subtitle={`Cohort prediction rates vs IGVF 10M background (${IGVF_BASELINE.totalVariants.toLocaleString()} variants).`}>Baseline Enrichment Comparison</SectionTitle>
      <div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="border-b border-border">
          <th className="py-2 px-2 text-left text-muted-foreground font-medium">Method</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Cohort</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Cohort Rate</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">10M Rate</th>
          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Fold</th>
        </tr></thead>
        <tbody>{data.baselineRates.map((b) => {
          const cohortN = data.cohortPredCounts?.[b.method] ?? 0;
          const cohortRate = (data.cohortTotal ?? 0) > 0 ? cohortN / data.cohortTotal : 0;
          const fold = b.rate > 0 ? cohortRate / b.rate : 0;
          const foldColor = fold >= 2 ? "text-emerald-600 font-semibold" : fold >= 1.5 ? "text-emerald-600" : "text-foreground";
          return <tr key={b.method} className="border-b border-border/50">
            <td className="py-1.5 px-2 text-foreground font-medium">{b.method.replace("pred_", "")}</td>
            <td className="py-1.5 px-2 text-right tabular-nums">{cohortN > 0 && onFilterClick
              ? <button onClick={() => onFilterClick({ label: `${b.method.replace("pred_", "")} variants`, sql: b.method })}
                  className="text-primary hover:text-primary/80 underline decoration-primary/30 cursor-pointer">{cohortN}</button>
              : <span className="text-foreground">{cohortN}</span>}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{fmtPct(cohortRate)}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{fmtPct(b.rate)}</td>
            <td className={cn("py-1.5 px-2 text-right tabular-nums", foldColor)}>{fold >= 0.05 ? `${fold.toFixed(1)}x` : fold > 0 ? `${fold.toFixed(2)}x` : "—"}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>}
  </div>;
}

// ============================================================================
// Data Loading
// ============================================================================

type LoadStage = "loading_data" | "fetching_urls" | "loading_enrichment" | "analyzing";

// One state var instead of 5 (report, isLoading, stage, error, loadStarted).
// Each transition is a single setState — no cascading renders.
type IgvfLoadState =
  | { type: "idle" }
  | { type: "loading"; stage: LoadStage }
  | { type: "error"; message: string }
  | { type: "ready"; report: IgvfReportData };

function useIgvfData(cohortId: string, dataUrl: string) {
  const { query, loadParquet, isLoading: dbLoading, isReady, error: dbError } = useDuckDB();
  const [state, setState] = useState<IgvfLoadState>({ type: "idle" });
  const loadStartedRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (!isReady) return;
    setState({ type: "loading", stage: "loading_data" });
    try {
      await loadParquet(dataUrl, "variants", `cohort:${cohortId}:data`);

      setState({ type: "loading", stage: "fetching_urls" });
      const files = await getCohortFiles(cohortId);

      setState({ type: "loading", stage: "loading_enrichment" });
      const loaded: Array<{ label: string; rows: number }> = [];
      for (const label of ENRICHMENT_LABELS) {
        const file = files.files.find((f) => f.label === `${label}.parquet` || f.label === label);
        if (file) {
          try {
            await loadParquet(file.url, label, `cohort:${cohortId}:${label}`);
            const r = await query(`SELECT count(*) as n FROM ${label}`);
            const cnt = r.rows[0]?.n;
            loaded.push({ label, rows: typeof cnt === "number" ? cnt : typeof cnt === "bigint" ? Number(cnt) : 0 });
          } catch { await query(`CREATE TABLE IF NOT EXISTS ${label} (vid UBIGINT)`); loaded.push({ label, rows: 0 }); }
        } else {
          await query(`CREATE TABLE IF NOT EXISTS ${label} (vid UBIGINT)`); loaded.push({ label, rows: 0 });
        }
      }

      setState({ type: "loading", stage: "analyzing" });
      const report = await generateIgvfReport(query, loaded);
      setState({ type: "ready", report });
    } catch (err) {
      console.error("[IGVF]", err);
      setState({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  }, [isReady, cohortId, dataUrl, loadParquet, query]);

  useEffect(() => {
    if (isReady && !loadStartedRef.current) {
      loadStartedRef.current = true;
      loadAll();
    }
  }, [isReady, loadAll]);

  return {
    report: state.type === "ready" ? state.report : null,
    isLoading: dbLoading || state.type === "loading",
    stage: state.type === "loading" ? state.stage : ("loading_data" as LoadStage),
    error: dbError || (state.type === "error" ? state.message : null),
    retry: loadAll,
    query,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function IgvfLipidReport({ cohortId, dataUrl, className }: { cohortId: string; dataUrl: string; className?: string }) {
  const { report, isLoading, stage, error, retry, query } = useIgvfData(cohortId, dataUrl);
  // User's explicit selection; null = use default (first available)
  const [selectedDataset, setSelectedDataset] = useState<DatasetId | null>(null);
  const [variantFilter, setVariantFilter] = useState<VariantFilter | null>(null);

  // Derive active dataset — falls through to first available when no explicit selection.
  // No useEffect cascade needed.
  const activeDataset = selectedDataset ?? (report?.availableDatasets[0] ?? null);

  if (isLoading) {
    const labels: Record<LoadStage, string> = {
      loading_data: "Loading FAVOR annotations…", fetching_urls: "Fetching enrichment files…",
      loading_enrichment: "Loading enrichment parquets…", analyzing: "Running analysis…",
    };
    return <div className="flex flex-col items-center justify-center text-center py-20">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-sm font-medium text-foreground">{labels[stage]}</p>
    </div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4"><AlertCircle className="w-6 h-6 text-rose-600" /></div>
      <p className="text-sm font-semibold text-foreground mb-2">Analysis failed</p>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
      <Button variant="outline" onClick={retry}><RefreshCw className="w-4 h-4" /> Retry</Button>
    </div>;
  }

  if (!report || report.availableDatasets.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-20">No experimental datasets with sufficient overlap found.</p>;
  }

  const activeReport = activeDataset ? report.reports[activeDataset] : null;
  const datasetLabels = report.availableDatasets.map((id) => {
    const def = DATASET_DEFS.find((d) => d.id === id)!;
    const r = report.reports[id];
    return { value: id, label: `${def.label} (${(r?.variantCount ?? 0).toLocaleString()})` };
  });

  return <div className={cn("max-w-5xl mx-auto print:max-w-none space-y-10", className)}>
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
      <h2 className="text-base font-semibold text-foreground mb-4">Per-Dataset Analysis</h2>
      {report.availableDatasets.length > 1 && (
        <div className="mb-6 print:hidden">
          <SegmentedControl value={activeDataset!} onChange={setSelectedDataset} options={datasetLabels} />
        </div>
      )}
      {/* Screen: show active tab only. Print: show all datasets. */}
      <div className="print:hidden">
        {activeReport && <DatasetReportView report={activeReport} totalVariants={report.totalVariants} onFilterClick={setVariantFilter} />}
      </div>
      <div className="hidden print:block space-y-12">
        {report.availableDatasets.map((id) => {
          const r = report.reports[id];
          const def = DATASET_DEFS.find((d) => d.id === id)!;
          if (!r) return null;
          return <div key={id}>
            <h3 className="text-sm font-semibold text-foreground mb-4 border-b border-border pb-2">{def.label} ({r.variantCount})</h3>
            <DatasetReportView report={r} totalVariants={report.totalVariants} />
          </div>;
        })}
      </div>
    </div>

    {/* Section 3: Cross-Dataset Context */}
    <CrossDatasetContext data={report.crossDataset} onFilterClick={setVariantFilter} />

    <footer className="pt-4 mt-4 border-t border-border text-[10px] text-muted-foreground">
      IGVF Lipid Analysis &middot; {report.loadedTables?.length ?? 0} enrichment tables ({report.loadedTables?.filter((t) => t.rows > 0).length ?? 0} with data) &middot;
      {report.availableDatasets.length} dataset{report.availableDatasets.length > 1 ? "s" : ""} &middot; GRCh38/hg38
    </footer>

    {variantFilter && <VariantDrawer filter={variantFilter} onClose={() => setVariantFilter(null)} query={query} />}
  </div>;
}
