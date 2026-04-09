"use client";

import type { GeneVariantStatistics } from "@features/gene/api/variant-statistics";
import {
  buildExplorerHref,
  type ExplorerFilters,
  type VariantSummaryScope,
} from "@features/gene/api/variant-explorer-link";
import type { RegionBin } from "@features/region/api/region-statistics";
import {
  Plot,
  PLOTLY_FONT,
  PLOTLY_CONFIG_STATIC,
} from "@shared/components/ui/charts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

// Re-export the scope type so the page wrappers can construct it
// without a second import.
export type { VariantSummaryScope } from "@features/gene/api/variant-explorer-link";

// ============================================================================
// Data helpers
// ============================================================================

type Counts = Record<string, number>;

function get(c: Counts | undefined, key: string): number {
  return c?.[key] ?? 0;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function pctNum(n: number, total: number): number {
  if (total === 0) return 0;
  return (n / total) * 100;
}

// ============================================================================
// Drill-down filter maps
//
// Label → ExplorerFilters. Each chart's onClick handler does one map lookup.
// Enum strings must match the literal API values declared in
// src/features/gene/components/variant-explorer-table.tsx VARIANT_FILTERS.
// ============================================================================

const LOCATION_TO_FILTER: Record<string, ExplorerFilters> = {
  Exonic: { gencode_region_type: ["exonic"] },
  Splicing: { gencode_region_type: ["splicing"] },
  Intronic: { gencode_region_type: ["intronic"] },
  UTR: { gencode_region_type: ["UTR3", "UTR5", "UTR5;UTR3"] },
  ncRNA: {
    gencode_region_type: [
      "ncRNA_exonic",
      "ncRNA_intronic",
      "ncRNA_splicing",
      "ncRNA_exonic;splicing",
    ],
  },
  Upstream: { gencode_region_type: ["upstream"] },
  Downstream: { gencode_region_type: ["downstream"] },
  Intergenic: { gencode_region_type: ["intergenic"] },
};

const FREQ_TO_FILTER: Record<string, ExplorerFilters | undefined> = {
  // Singleton/Doubleton stay non-clickable (no single-filter expression).
  Common: { gnomad_genome_af_min: 0.05 },
  "Low Freq": { gnomad_genome_af_min: 0.01, gnomad_genome_af_max: 0.05 },
  Rare: { gnomad_genome_af_min: 0.001, gnomad_genome_af_max: 0.01 },
  Singleton: undefined,
  Doubleton: undefined,
  "Ultra-Rare": { gnomad_genome_af_max: 0.001 },
};

const CONSEQUENCE_TO_FILTER: Record<string, ExplorerFilters> = {
  Missense: { gencode_consequence: ["nonsynonymous SNV"] },
  Synonymous: { gencode_consequence: ["synonymous SNV"] },
  Nonsense: { gencode_consequence: ["stopgain"] },
  Frameshift: {
    gencode_consequence: ["frameshift insertion", "frameshift deletion"],
  },
  "In-frame": {
    gencode_consequence: [
      "nonframeshift insertion",
      "nonframeshift deletion",
    ],
  },
  LoF: {
    gencode_consequence: [
      "stopgain",
      "stoploss",
      "frameshift insertion",
      "frameshift deletion",
    ],
  },
};

const CLINVAR_TO_FILTER: Record<string, ExplorerFilters> = {
  Pathogenic: { clinvar_clnsig: ["Pathogenic"] },
  "Likely Pathogenic": { clinvar_clnsig: ["Likely_pathogenic"] },
  Conflicting: {
    clinvar_clnsig: ["Conflicting_classifications_of_pathogenicity"],
  },
  Uncertain: { clinvar_clnsig: ["Uncertain_significance"] },
  "Likely Benign": { clinvar_clnsig: ["Likely_benign"] },
  Benign: { clinvar_clnsig: ["Benign"] },
  "Drug Response": { clinvar_clnsig: ["drug_response"] },
};

// ============================================================================
// Chart 1 — Treemap: Genomic Location
// ============================================================================

function LocationTreemap({
  counts,
  scope,
}: {
  counts: Counts;
  scope: VariantSummaryScope;
}) {
  const router = useRouter();

  const cats = [
    { label: "Exonic", parent: "Protein-coding", value: get(counts, "locExonic"), color: "#7c3aed" },
    { label: "Splicing", parent: "Protein-coding", value: get(counts, "locSplicing"), color: "#a78bfa" },
    { label: "Intronic", parent: "Genic non-coding", value: get(counts, "locIntronic"), color: "#2563eb" },
    { label: "UTR", parent: "Genic non-coding", value: get(counts, "locUtr"), color: "#60a5fa" },
    { label: "ncRNA", parent: "Genic non-coding", value: get(counts, "locNcrna"), color: "#93c5fd" },
    { label: "Upstream", parent: "Outside genes", value: get(counts, "locUpstream"), color: "#94a3b8" },
    { label: "Downstream", parent: "Outside genes", value: get(counts, "locDownstream"), color: "#a1a1aa" },
    { label: "Intergenic", parent: "Outside genes", value: get(counts, "locIntergenic"), color: "#cbd5e1" },
  ].filter((d) => d.value > 0);

  if (cats.length === 0) return null;

  const parentColors: Record<string, string> = {
    "Protein-coding": "#ede9fe",
    "Genic non-coding": "#dbeafe",
    "Outside genes": "#f1f5f9",
  };

  const parentTotals: Record<string, number> = {};
  for (const c of cats) parentTotals[c.parent] = (parentTotals[c.parent] ?? 0) + c.value;
  const parentKeys = Object.keys(parentTotals);

  const labels = [...parentKeys, ...cats.map((c) => c.label)];
  const parents = [...parentKeys.map(() => ""), ...cats.map((c) => c.parent)];
  const values = [...parentKeys.map((k) => parentTotals[k]), ...cats.map((c) => c.value)];
  const colors = [
    ...parentKeys.map((k) => parentColors[k] ?? "#f5f5f5"),
    ...cats.map((c) => c.color),
  ];

  return (
    <Plot
      data={[
        {
          type: "treemap" as const,
          labels,
          parents,
          values,
          branchvalues: "total" as const,
          marker: { colors, line: { width: 2, color: "white" } },
          texttemplate: "<b>%{label}</b><br>%{value:,}",
          hovertemplate:
            "<b>%{label}</b><br>%{value:,} variants (%{percentRoot:.1%})<br><i>click to filter explorer</i><extra></extra>",
          pathbar: { visible: false },
        } as Partial<Plotly.PlotData>,
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        height: 320,
        margin: { l: 4, r: 4, t: 24, b: 4 },
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%", cursor: "pointer" }}
      onClick={(e: Readonly<Plotly.PlotMouseEvent>) => {
        const label = (e.points?.[0] as { label?: string } | undefined)?.label;
        if (!label) return;
        const filters = LOCATION_TO_FILTER[label];
        if (filters) router.push(buildExplorerHref(scope, filters));
      }}
    />
  );
}

// ============================================================================
// Chart 2 — Stacked Bar: Consequence × SNV/Indel
// ============================================================================

function ConsequenceChart({
  counts,
  scope,
}: {
  counts: Counts;
  scope: VariantSummaryScope;
}) {
  const router = useRouter();

  const rows = [
    { label: "Missense", snv: get(counts, "funcMissenseSnv"), indel: get(counts, "funcMissenseIndel") },
    { label: "Synonymous", snv: get(counts, "funcSynonymousSnv"), indel: get(counts, "funcSynonymousIndel") },
    { label: "Nonsense", snv: get(counts, "funcNonsenseSnv"), indel: get(counts, "funcNonsenseIndel") },
    { label: "Frameshift", snv: get(counts, "funcFrameshiftSnv"), indel: get(counts, "funcFrameshiftIndel") },
    { label: "In-frame", snv: get(counts, "funcInframeSnv"), indel: get(counts, "funcInframeIndel") },
    { label: "LoF", snv: get(counts, "funcLofSnv"), indel: get(counts, "funcLofIndel") },
  ].filter((r) => r.snv + r.indel > 0);

  if (rows.length === 0) return null;

  const reversed = [...rows].reverse();

  return (
    <Plot
      data={[
        {
          type: "bar" as const,
          orientation: "h" as const,
          y: reversed.map((r) => r.label),
          x: reversed.map((r) => r.snv),
          name: "SNV",
          marker: { color: "#7c3aed" },
          hovertemplate: "%{y}: %{x:,} SNVs<extra></extra>",
        },
        {
          type: "bar" as const,
          orientation: "h" as const,
          y: reversed.map((r) => r.label),
          x: reversed.map((r) => r.indel),
          name: "Indel",
          marker: { color: "#06b6d4" },
          hovertemplate: "%{y}: %{x:,} Indels<extra></extra>",
        },
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        barmode: "stack",
        bargap: 0.3,
        height: Math.max(160, rows.length * 32 + 50),
        margin: { l: 90, r: 20, t: 5, b: 30 },
        xaxis: {
          showgrid: true,
          gridcolor: "#f0f0f0",
          showline: false,
          zeroline: false,
          tickfont: { size: 10 },
        },
        yaxis: { showline: false, showgrid: false, tickfont: { size: 11 } },
        legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center", font: { size: 11 } },
        showlegend: true,
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%", cursor: "pointer" }}
      onClick={(e: Readonly<Plotly.PlotMouseEvent>) => {
        const point = e.points?.[0] as { y?: string } | undefined;
        const label = point?.y;
        if (!label) return;
        const filters = CONSEQUENCE_TO_FILTER[label];
        if (filters) router.push(buildExplorerHref(scope, filters));
      }}
    />
  );
}

// ============================================================================
// Chart 3 — Diverging Bar: ClinVar Significance
// ============================================================================

function ClinvarDiverging({
  counts,
  scope,
}: {
  counts: Counts;
  scope: VariantSummaryScope;
}) {
  const router = useRouter();

  const path = get(counts, "clinPathogenic");
  const likelyPath = get(counts, "clinLikelyPathogenic");
  const uncertain = get(counts, "clinUncertain");
  const conflicting = get(counts, "clinConflicting");
  const likelyBenign = get(counts, "clinLikelyBenign");
  const benign = get(counts, "clinBenign");
  const drugResponse = get(counts, "clinDrugResponse");

  const total = path + likelyPath + uncertain + conflicting + likelyBenign + benign + drugResponse;
  if (total === 0) return null;

  const categories = [
    "Drug Response",
    "Benign",
    "Likely Benign",
    "Uncertain",
    "Conflicting",
    "Likely Pathogenic",
    "Pathogenic",
  ];
  const values = [drugResponse, -benign, -likelyBenign, uncertain, conflicting, likelyPath, path];
  const colors = [
    "#3b82f6",
    "#16a34a",
    "#22c55e",
    "#ca8a04",
    "#94a3b8",
    "#f97316",
    "#dc2626",
  ];

  const visible = categories
    .map((c, i) => ({ category: c, value: values[i], color: colors[i] }))
    .filter((d) => d.value !== 0);

  if (visible.length === 0) return null;

  return (
    <Plot
      data={visible.map((d) => ({
        type: "bar" as const,
        orientation: "h" as const,
        y: ["ClinVar"],
        x: [d.value],
        name: d.category,
        marker: { color: d.color },
        hovertemplate: `${d.category}: ${fmt(Math.abs(d.value))}<extra></extra>`,
      }))}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        barmode: "relative",
        height: 120,
        margin: { l: 10, r: 10, t: 5, b: 30 },
        xaxis: {
          showgrid: false,
          showline: false,
          zeroline: true,
          zerolinecolor: "#171717",
          zerolinewidth: 1,
          tickfont: { size: 10 },
          tickformat: ",d",
        },
        yaxis: { showline: false, showticklabels: false },
        legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center", font: { size: 10 } },
        showlegend: true,
        annotations: [
          { x: 0, y: 1.15, xref: "paper", yref: "paper", text: "<b>← Benign</b>", showarrow: false, font: { size: 11, color: "#16a34a" }, xanchor: "left" },
          { x: 1, y: 1.15, xref: "paper", yref: "paper", text: "<b>Pathogenic →</b>", showarrow: false, font: { size: 11, color: "#dc2626" }, xanchor: "right" },
        ],
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%", cursor: "pointer" }}
      onClick={(e: Readonly<Plotly.PlotMouseEvent>) => {
        const point = e.points?.[0] as { data?: { name?: string } } | undefined;
        const name = point?.data?.name;
        if (!name) return;
        const filters = CLINVAR_TO_FILTER[name];
        if (filters) router.push(buildExplorerHref(scope, filters));
      }}
    />
  );
}

// ============================================================================
// Chart 4 — Allele Frequency Spectrum
// ============================================================================

function FrequencySpectrum({
  counts,
  scope,
}: {
  counts: Counts;
  scope: VariantSummaryScope;
}) {
  const router = useRouter();

  const bins = [
    { label: "Common", display: "Common\n(>5%)", value: get(counts, "freqCommon"), color: "#3b82f6" },
    { label: "Low Freq", display: "Low Freq\n(1–5%)", value: get(counts, "freqLow"), color: "#6366f1" },
    { label: "Rare", display: "Rare\n(0.1–1%)", value: get(counts, "freqRare"), color: "#8b5cf6" },
    { label: "Singleton", display: "Singleton", value: get(counts, "freqSingleton"), color: "#a855f7" },
    { label: "Doubleton", display: "Doubleton", value: get(counts, "freqDoubleton"), color: "#c084fc" },
    { label: "Ultra-Rare", display: "Ultra-Rare\n(<0.1%)", value: get(counts, "freqUltraRare"), color: "#e879f9" },
  ].filter((b) => b.value > 0);

  if (bins.length === 0) return null;

  const total = bins.reduce((s, b) => s + b.value, 0);
  const rareAndBelow = bins
    .filter((b) => !b.label.startsWith("Common") && !b.label.startsWith("Low"))
    .reduce((s, b) => s + b.value, 0);
  const rarePct = total > 0 ? ((rareAndBelow / total) * 100).toFixed(0) : "0";

  // x is the canonical label (used for the click lookup); displayLabel is multi-line.
  return (
    <Plot
      data={[
        {
          type: "bar" as const,
          x: bins.map((b) => b.label),
          y: bins.map((b) => b.value),
          marker: { color: bins.map((b) => b.color) },
          customdata: bins.map((b) => b.display),
          hovertemplate: "%{customdata}: %{y:,} variants<extra></extra>",
          texttemplate: "%{y:,}",
          textposition: "outside" as const,
          textfont: { size: 10, color: "#737373" },
          cliponaxis: false,
        },
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: 260,
        margin: { l: 50, r: 20, t: 25, b: 60 },
        xaxis: {
          showline: false,
          showgrid: false,
          tickfont: { size: 10 },
          tickvals: bins.map((b) => b.label),
          ticktext: bins.map((b) => b.display),
        },
        yaxis: {
          showgrid: true,
          gridcolor: "#f0f0f0",
          showline: false,
          zeroline: false,
          tickfont: { size: 10 },
        },
        bargap: 0.35,
        annotations: [
          {
            x: 1,
            y: 1.05,
            xref: "paper",
            yref: "paper",
            text: `<b>${rarePct}%</b> rare or rarer`,
            showarrow: false,
            font: { size: 12, color: "#7c3aed" },
            xanchor: "right",
          },
        ],
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%", cursor: "pointer" }}
      onClick={(e: Readonly<Plotly.PlotMouseEvent>) => {
        const point = e.points?.[0] as { x?: string } | undefined;
        const label = point?.x;
        if (!label) return;
        const filters = FREQ_TO_FILTER[label];
        if (filters) router.push(buildExplorerHref(scope, filters));
      }}
    />
  );
}

// ============================================================================
// Chart 5 — Variant Scoring Fingerprint
//
// One horizontal bar chart, three visually grouped sections (PHRED predictors,
// categorical predictors, regulatory features) on a single 0–100% x-axis.
// CADD is a 2-segment overlay (≥10 light, ≥20 dark) — the only multi-threshold
// metric in the API. Replaces both the conflated radar AND the lollipop.
// ============================================================================

type FingerprintRow = {
  group: "phred" | "categorical" | "regulatory";
  label: string;
  value: number;            // % of varTotal
  highValue?: number;       // CADD only — % of varTotal at ≥20 (overlay)
  filters?: ExplorerFilters;
};

function buildFingerprintRows(counts: Counts, total: number): FingerprintRow[] {
  if (total === 0) return [];

  // CADD has two thresholds in the API (predCaddPhred10 + predCaddPhred20).
  // Show as one bar where the lighter segment = ≥10 (90% conf) and the
  // darker overlay = ≥20 (99% conf). aPC components are PHRED-scaled too
  // but the API only exposes a single backend-defined threshold per aPC
  // field, so we don't put a numeric suffix on those labels — putting one
  // only on CADD would mislead.
  const caddLow = get(counts, "predCaddPhred10");
  const caddHigh = get(counts, "predCaddPhred20");
  const caddRow: FingerprintRow | null =
    caddLow > 0 || caddHigh > 0
      ? {
          group: "phred",
          label: "CADD",
          value: pctNum(caddLow > 0 ? caddLow : caddHigh, total),
          highValue:
            caddLow > 0 && caddHigh > 0 ? pctNum(caddHigh, total) : undefined,
          filters: caddLow > 0 ? { cadd_phred_min: 10 } : { cadd_phred_min: 20 },
        }
      : null;

  const rows: (FingerprintRow | null)[] = [
    caddRow,
    {
      group: "phred",
      label: "REVEL",
      value: pctNum(get(counts, "predRevelPathogenic"), total),
      filters: { revel_max_genome_min: 0.5 },
    },
    {
      group: "phred",
      label: "SpliceAI",
      value: pctNum(get(counts, "predSpliceaiAffecting"), total),
      filters: { spliceai_max_genome_min: 0.5 },
    },
    {
      group: "phred",
      label: "AlphaMissense",
      value: pctNum(get(counts, "predAlphamissensePathogenic"), total),
      filters: { alphamissense_class: ["likely_pathogenic"] },
    },
    {
      group: "phred",
      label: "aPC Conservation",
      value: pctNum(get(counts, "apcConservation"), total),
      filters: { apc_conservation_min: 10 },
    },
    {
      group: "phred",
      label: "aPC Protein Function",
      value: pctNum(get(counts, "apcProteinFunction"), total),
    },
    {
      group: "phred",
      label: "aPC Epigenetics Active",
      value: pctNum(get(counts, "apcEpigeneticsActive"), total),
    },
    {
      group: "phred",
      label: "aPC Epigenetics Repressed",
      value: pctNum(get(counts, "apcEpigeneticsRepressed"), total),
    },
    {
      group: "phred",
      label: "aPC Transcription Factor",
      value: pctNum(get(counts, "apcTranscriptionFactor"), total),
    },
    {
      group: "categorical",
      label: "SIFT",
      value: pctNum(get(counts, "predSiftDeleterious"), total),
      filters: { sift_cat: ["deleterious"] },
    },
    {
      group: "categorical",
      label: "PolyPhen",
      value: pctNum(get(counts, "predPolyphenDamaging"), total),
      filters: { polyphen_cat: ["probably_damaging", "possibly_damaging"] },
    },
    {
      group: "categorical",
      label: "MetaSVM",
      value: pctNum(get(counts, "predMetasvmDamaging"), total),
      filters: { dbnsfp_metasvm_pred: ["D"] },
    },
    {
      group: "regulatory",
      label: "Enhancer",
      value: pctNum(get(counts, "regEnhancer"), total),
    },
    {
      group: "regulatory",
      label: "Promoter",
      value: pctNum(get(counts, "regPromoter"), total),
    },
  ];

  return rows.filter((r): r is FingerprintRow => r !== null && r.value > 0);
}

/**
 * Pure HTML/CSS rendering — no Plotly. Plotly's annotations don't lay out
 * cleanly next to y-axis tick labels (they collide), and a horizontal bar
 * chart at a fixed 0–100% scale is trivially expressible in CSS. Going
 * native gives us pixel-perfect spacing, real headings, accessible click
 * targets, and zero layout fights.
 */
function VariantScoringFingerprint({
  counts,
  total,
  scope,
}: {
  counts: Counts;
  total: number;
  scope: VariantSummaryScope;
}) {
  const router = useRouter();
  const rows = useMemo(() => buildFingerprintRows(counts, total), [counts, total]);

  if (rows.length === 0) return null;

  const groupDefs: { key: FingerprintRow["group"]; label: string }[] = [
    { key: "phred", label: "PHRED-scaled" },
    { key: "categorical", label: "Categorical" },
    { key: "regulatory", label: "Regulatory" },
  ];

  const groups = groupDefs
    .map((g) => ({
      ...g,
      rows: rows
        .filter((r) => r.group === g.key)
        .sort((a, b) => b.value - a.value),
    }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="px-3 pt-3 pb-4 space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {group.label}
          </h4>
          <ul className="space-y-0.5">
            {group.rows.map((row) => (
              <FingerprintBar
                key={row.label}
                row={row}
                onClick={
                  row.filters
                    ? () => router.push(buildExplorerHref(scope, row.filters!))
                    : undefined
                }
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FingerprintBar({
  row,
  onClick,
}: {
  row: FingerprintRow;
  onClick?: () => void;
}) {
  const clickable = !!onClick;

  const inner = (
    <>
      <span className="text-xs text-foreground truncate">{row.label}</span>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            clickable
              ? "bg-primary/40 group-hover:bg-primary/60"
              : "bg-muted-foreground/25",
          )}
          style={{ width: `${Math.min(100, row.value)}%` }}
        />
        {/* CADD high-confidence overlay (≥20) on top of the ≥10 bar. */}
        {row.highValue !== undefined && (
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={{ width: `${Math.min(100, row.highValue)}%` }}
          />
        )}
      </div>
      <span className="text-xs font-medium tabular-nums text-foreground text-right">
        {row.value.toFixed(1)}%
      </span>
    </>
  );

  const className = cn(
    "grid w-full items-center gap-3 px-2 py-1.5 rounded-md text-left group",
    "grid-cols-[180px_1fr_48px]",
    clickable && "cursor-pointer hover:bg-muted/40 transition-colors",
  );

  return (
    <li>
      {clickable ? (
        <button type="button" onClick={onClick} className={className}>
          {inner}
        </button>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

// ============================================================================
// Chart 6 — Region Spatial Strip (region-only)
//
// Plotly heatmap, 5 metrics × N bins, z-scored across bins so "this bin is
// hotter than its neighbors" is the visual signal. Column-click pushes a
// sub-region URL into the variant explorer.
// ============================================================================

function zScore(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / sd);
}

function formatBp(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(2)} Mb`;
  if (bp >= 1_000) return `${(bp / 1_000).toFixed(0)} kb`;
  return `${bp} bp`;
}

function RegionSpatialStrip({
  bins,
  loc,
}: {
  bins: RegionBin[];
  loc: string;
}) {
  const router = useRouter();

  const metrics = useMemo(() => {
    const defs: { label: string; extract: (c: Counts) => number }[] = [
      { label: "Variant density", extract: (c) => get(c, "varTotal") },
      {
        label: "ClinVar Path/LP",
        extract: (c) => get(c, "clinPathogenic") + get(c, "clinLikelyPathogenic"),
      },
      { label: "Ultra-rare (<0.1%)", extract: (c) => get(c, "freqUltraRare") },
      { label: "CADD ≥20", extract: (c) => get(c, "predCaddPhred20") },
      { label: "aPC Conservation", extract: (c) => get(c, "apcConservation") },
    ];

    // For each metric, build the per-bin raw values + the z-scored series.
    return defs
      .map((d) => {
        const raw = bins.map((b) => d.extract(b.counts));
        const z = zScore(raw);
        // Skip rows where there's no spatial signal.
        const sd = Math.sqrt(
          raw.reduce((s, v) => {
            const m = raw.reduce((a, x) => a + x, 0) / raw.length;
            return s + (v - m) ** 2;
          }, 0) / raw.length,
        );
        return { label: d.label, raw, z, hasSignal: sd > 0 };
      })
      .filter((m) => m.hasSignal);
  }, [bins]);

  if (bins.length < 2 || metrics.length === 0) return null;

  // X-axis tick positions: first, middle, last bin's binStart in Mb-friendly form.
  const tickIdx = [0, Math.floor(bins.length / 2), bins.length - 1];
  const tickText = tickIdx.map((i) => formatBp(bins[i].binStart));

  // Heatmap z values: rows correspond to metrics (y), columns to bins (x).
  const z = metrics.map((m) => m.z);
  const rawZ = metrics.map((m) => m.raw);

  return (
    <Plot
      data={[
        {
          type: "heatmap" as const,
          x: bins.map((_, i) => i),
          y: metrics.map((m) => m.label),
          z,
          customdata: rawZ,
          colorscale: [
            [0, "#1e3a8a"],
            [0.5, "#ffffff"],
            [1, "#b91c1c"],
          ],
          zmid: 0,
          xgap: 1,
          ygap: 2,
          hovertemplate:
            "<b>%{y}</b><br>bin %{x} (%{customdata:,} variants)<br>z = %{z:.2f}<br><i>click column to filter</i><extra></extra>",
          colorbar: {
            title: { text: "z-score", font: { size: 10 } },
            tickfont: { size: 9 },
            thickness: 10,
            len: 0.7,
          },
        } as Partial<Plotly.PlotData>,
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: Math.max(220, metrics.length * 36 + 80),
        margin: { l: 150, r: 70, t: 10, b: 40 },
        xaxis: {
          showgrid: false,
          showline: false,
          zeroline: false,
          tickvals: tickIdx,
          ticktext: tickText,
          tickfont: { size: 10 },
        },
        yaxis: {
          showline: false,
          showgrid: false,
          tickfont: { size: 11 },
        },
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%", cursor: "pointer" }}
      onClick={(e: Readonly<Plotly.PlotMouseEvent>) => {
        const point = e.points?.[0] as { x?: number } | undefined;
        if (point?.x === undefined) return;
        const bin = bins[point.x];
        if (!bin) return;
        const binLoc = `${bin.chromosome}-${bin.binStart}-${bin.binEnd}`;
        router.push(
          `/hg38/region/${encodeURIComponent(binLoc)}/variants/variant-explorer`,
        );
      }}
    />
  );
}

// ============================================================================
// DrillTile — replaces StatMetric. Wraps in a Link when filters are provided.
// ============================================================================

function DrillTile({
  label,
  value,
  sub,
  scope,
  filters,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  scope: VariantSummaryScope;
  filters?: ExplorerFilters;
  hint?: React.ReactNode;
}) {
  const card = (
    <div
      className={
        "rounded-lg border border-border bg-card p-4 h-full transition" +
        (filters ? " hover:border-primary/50 hover:shadow-sm" : "")
      }
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
        {value}
      </span>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return filters ? (
    <Link href={buildExplorerHref(scope, filters)} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

// ============================================================================
// ClinicalInterestTile — popover with three sub-links (OR composite)
// ============================================================================

function ClinicalInterestTile({
  counts,
  scope,
}: {
  counts: Counts;
  scope: VariantSummaryScope;
}) {
  const value = get(counts, "scoreClinicalInterest");
  const clinvarSub = get(counts, "clinPathogenic") + get(counts, "clinLikelyPathogenic");
  const cosmicSub = get(counts, "cosmicTier1");
  const damagingRareSub = Math.min(
    get(counts, "predCaddPhred20"),
    get(counts, "freqUltraRare"),
  );

  const subLinks: {
    label: string;
    sub: number;
    filters: ExplorerFilters;
  }[] = [
    {
      label: "ClinVar P/LP",
      sub: clinvarSub,
      filters: { clinvar_clnsig: ["Pathogenic", "Likely_pathogenic"] },
    },
    {
      label: "COSMIC Tier 1",
      sub: cosmicSub,
      filters: { cosmic_tier: ["1"] },
    },
    {
      label: "Damaging & rare",
      sub: damagingRareSub,
      filters: { cadd_phred_min: 20, gnomad_genome_af_max: 0.001 },
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-4 h-full text-left transition hover:border-primary/50 hover:shadow-sm w-full"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Clinical Interest
            </span>
            <Info className="h-3 w-3 text-muted-foreground/50" />
          </div>
          <span className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
            {fmt(value)}
          </span>
          <p className="text-xs text-muted-foreground mt-1">click for breakdown</p>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">
          Variants meeting <em>any</em> of these criteria. Click a row to view
          that subset in the explorer.
        </p>
        <div className="space-y-0.5">
          {subLinks.map((link) => (
            <Link
              key={link.label}
              href={buildExplorerHref(scope, link.filters)}
              className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted/50 transition group"
            >
              <span className="text-sm text-foreground">{link.label}</span>
              <span className="flex items-center gap-1.5">
                {link.sub > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmt(link.sub)}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              </span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Card wrapper
// ============================================================================

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border/60">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <div className="px-2 pt-1">{children}</div>
    </div>
  );
}

// ============================================================================
// Main
// ============================================================================

export interface VariantSummaryStatisticsProps {
  stats: GeneVariantStatistics | null;
  scope: VariantSummaryScope;
}

export function VariantSummaryStatistics({
  stats,
  scope,
}: VariantSummaryStatisticsProps) {
  const counts = stats?.counts;
  const total = get(counts, "varTotal");

  const hasConsequence = useMemo(
    () =>
      [
        "funcMissense",
        "funcSynonymous",
        "funcNonsense",
        "funcFrameshift",
        "funcInframe",
        "funcLof",
      ].some((k) => get(counts, k) > 0),
    [counts],
  );
  const hasClinvar = useMemo(
    () =>
      [
        "clinPathogenic",
        "clinLikelyPathogenic",
        "clinUncertain",
        "clinBenign",
        "clinLikelyBenign",
        "clinConflicting",
        "clinDrugResponse",
      ].some((k) => get(counts, k) > 0),
    [counts],
  );
  const hasFingerprint = useMemo(
    () =>
      [
        "predCaddPhred10",
        "predCaddPhred20",
        "predRevelPathogenic",
        "predSpliceaiAffecting",
        "predAlphamissensePathogenic",
        "predSiftDeleterious",
        "predPolyphenDamaging",
        "predMetasvmDamaging",
        "apcConservation",
        "apcProteinFunction",
        "apcEpigeneticsActive",
        "regEnhancer",
        "regPromoter",
      ].some((k) => get(counts, k) > 0),
    [counts],
  );

  if (!stats) {
    const label =
      scope.kind === "gene" ? scope.geneSymbol : scope.loc;
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-base font-medium text-foreground mb-1">
          No Statistics Available
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Variant statistics are not available for{" "}
          <span className="font-medium text-foreground">{label}</span>.
        </p>
      </div>
    );
  }

  // Region-only spatial bins (typed via the discriminated scope).
  const regionBins =
    scope.kind === "region" && Array.isArray((scope as { bins?: RegionBin[] }).bins)
      ? ((scope as { bins?: RegionBin[] }).bins ?? [])
      : [];

  return (
    <div className="space-y-6">
      {/* Header tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <DrillTile
          label="Total Variants"
          value={fmt(total)}
          scope={scope}
        />
        <DrillTile
          label="SNVs"
          value={fmt(get(counts, "varSnv"))}
          sub={pct(get(counts, "varSnv"), total)}
          scope={scope}
          filters={{ variant_class: ["snv"] }}
        />
        <DrillTile
          label="Indels"
          value={fmt(get(counts, "varIndel"))}
          sub={pct(get(counts, "varIndel"), total)}
          scope={scope}
          filters={{ variant_class: ["indel"] }}
        />
        <ClinicalInterestTile counts={counts!} scope={scope} />
        <DrillTile
          label="Actionable"
          value={fmt(get(counts, "scoreActionable"))}
          scope={scope}
          filters={{
            clinvar_clnsig: ["Pathogenic", "Likely_pathogenic"],
            gnomad_genome_af_max: 0.001,
            gencode_region_type: ["exonic"],
          }}
          hint={
            <div className="space-y-1.5">
              <p className="font-medium text-white">All three criteria must be met:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>ClinVar pathogenic or likely pathogenic</li>
                <li>Rare allele frequency (AF &lt; 0.1%)</li>
                <li>Located in exonic (coding) regions</li>
              </ul>
            </div>
          }
        />
      </div>

      {/* Where + Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Where in the genome"
          subtitle="Larger tile = more variants. Click to filter."
        >
          <LocationTreemap counts={counts!} scope={scope} />
        </ChartCard>

        <ChartCard
          title="How rare"
          subtitle="Rare-heavy shapes point to selection. Click a bar to filter."
        >
          <FrequencySpectrum counts={counts!} scope={scope} />
        </ChartCard>
      </div>

      {/* What */}
      {(hasConsequence || hasClinvar) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hasConsequence && (
            <ChartCard
              title="Coding effect"
              subtitle="Each row split SNV (purple) vs indel (cyan). Click to filter."
            >
              <ConsequenceChart counts={counts!} scope={scope} />
            </ChartCard>
          )}

          {hasClinvar && (
            <ChartCard
              title="Clinical significance"
              subtitle="Pathogenic right, benign left. Click a band to filter."
            >
              <ClinvarDiverging counts={counts!} scope={scope} />
            </ChartCard>
          )}
        </div>
      )}

      {/* Variant Scoring Fingerprint — replaces radar + lollipop */}
      {hasFingerprint && (
        <ChartCard
          title="Prediction tools"
          subtitle="Fraction of variants each tool flags. Click a row to filter."
        >
          <VariantScoringFingerprint
            counts={counts!}
            total={total}
            scope={scope}
          />
        </ChartCard>
      )}

      {/* Region-only hotspot map */}
      {scope.kind === "region" && regionBins.length >= 2 && (
        <ChartCard
          title="Region hotspots"
          subtitle="Red = bin stands out from neighbors, blue = quiet. Click a column to zoom."
        >
          <RegionSpatialStrip bins={regionBins} loc={scope.loc} />
        </ChartCard>
      )}
    </div>
  );
}
