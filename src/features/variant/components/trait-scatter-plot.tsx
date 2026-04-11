"use client";

import { cn } from "@infra/utils";
import {
  Plot,
  type PlotParams,
} from "@shared/components/ui/charts/plotly-chart";
import { useDeferredValue, useMemo, useState } from "react";
import type { TraitPoint } from "../api/gwas-graph";

// plotly.js-dist-min ships without types; derive them from react-plotly.js.
type PlotData = PlotParams["data"][number];
type PlotLayout = PlotParams["layout"];
type PlotConfig = NonNullable<PlotParams["config"]>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENOME_WIDE_DEFAULT = 7.3; // -log₁₀(5e-8)
const CHART_HEIGHT = 460;
const THRESHOLD_SLIDER_MAX = 20;

type YScaleMode = "linear" | "sqrt";

const PALETTE = [
  "#f97316",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#eab308",
  "#ec4899",
  "#84cc16",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#d946ef",
];

const LABEL_MAP: Record<string, string> = {
  // Entity semantic_class (EFO ancestry)
  measurement: "Measurement",
  protein_measurement: "Protein",
  metabolite_measurement: "Metabolite",
  hematological_measurement: "Hematology",
  anthropometric: "Anthropometric",
  hormone_measurement: "Hormone",
  cytokine_measurement: "Cytokine",
  biological_process: "Biological process",
  biological_attribute: "Biological attr.",
  quality: "Quality",
  other: "Other",
  // Disease primary_anatomical_systems (OpenTargets therapeutic areas)
  cardiovascular: "Cardiovascular",
  nervous_system: "Neurological",
  psychiatric: "Psychiatric",
  metabolic: "Metabolic",
  oncology: "Oncology",
  immune_system: "Immune",
  respiratory: "Respiratory",
  digestive_system: "Digestive",
  endocrine: "Endocrine",
  genitourinary: "Genitourinary",
  musculoskeletal: "Musculoskeletal",
  genetic_congenital: "Genetic/congenital",
  hematologic: "Hematologic",
  skin: "Skin",
  // Signal study_type (credible sets)
  gwas: "GWAS",
  eqtl: "eQTL",
  pqtl: "pQTL",
  sqtl: "sQTL",
  tuqtl: "tuQTL",
  sceqtl: "sc-eQTL",
  // Fallback buckets
  disease: "Other disease",
  phenotype: "Phenotype",
};

function formatCategoryLabel(cat: string): string {
  return LABEL_MAP[cat] ?? cat.replace(/_/g, " ");
}

// Deterministic hash → value in [-1, 1] for within-category jitter.
function hashJitter(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 500 - 1;
}

function formatPScientific(mlog: number): string {
  if (mlog <= 0) return "1";
  const expFloor = Math.floor(mlog);
  const frac = mlog - expFloor;
  const mantissa = 10 ** -frac;
  return `${mantissa.toFixed(2)}e-${expFloor}`;
}

/**
 * Walk the visual (scaled) y space picking 5 evenly-spaced positions, then
 * label them with raw values. Critical for sqrt scales where uniform raw
 * ticks would cram together at the low end.
 */
function buildYTicks(
  yScale: YScaleMode,
  dataMax: number,
): { tickvals: number[]; ticktext: string[] } {
  if (dataMax <= 0) return { tickvals: [0], ticktext: ["0"] };
  const n = 5;
  const toScaled = yScale === "sqrt" ? Math.sqrt : (v: number) => v;
  const fromScaled =
    yScale === "sqrt" ? (v: number) => v * v : (v: number) => v;
  const sm = toScaled(dataMax);
  const tickvals = Array.from({ length: n + 1 }, (_, i) => (i * sm) / n);
  const ticktext = tickvals.map((v) => {
    const raw = fromScaled(v);
    if (dataMax <= 1) return raw.toFixed(2);
    if (dataMax <= 10) return raw.toFixed(1);
    const rounded = Math.round(raw);
    return rounded >= 1000
      ? `${Math.round(rounded / 100) / 10}k`
      : String(rounded);
  });
  return { tickvals, ticktext };
}

// Stable references so Plotly doesn't re-mount on every parent render.
const PLOT_CONFIG: PlotConfig = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: true,
};
const PLOT_STYLE = { width: "100%" } as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TraitScatterPlotProps {
  points: TraitPoint[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  /** Shown at the top of each hover tooltip (e.g., "rs7412") */
  variantLabel?: string;
  /** Y-axis title and tooltip row label. Default "−log₁₀(p)" / "−log₁₀P" */
  yAxisLabel?: string;
  yMetricLabel?: string;
  /** Show the auto-derived P-value row in the tooltip. False for PIP data. */
  showPValueInTooltip?: boolean;
  /** Default scale, threshold, and threshold slider cap */
  defaultScale?: YScaleMode;
  defaultThreshold?: number;
  thresholdMax?: number;
  /** Format a raw y-value for display (default: 2-decimal). */
  formatYValue?: (v: number) => string;
}

export function TraitScatterPlot({
  points,
  isLoading = false,
  title = "Trait associations",
  subtitle,
  variantLabel = "",
  yAxisLabel = "−log₁₀(p)",
  yMetricLabel = "−log₁₀P",
  showPValueInTooltip = true,
  defaultScale = "sqrt",
  defaultThreshold = GENOME_WIDE_DEFAULT,
  thresholdMax = THRESHOLD_SLIDER_MAX,
  formatYValue,
}: TraitScatterPlotProps) {
  const [yScale, setYScale] = useState<YScaleMode>(defaultScale);
  const [threshold, setThreshold] = useState(defaultThreshold);
  const formatY = formatYValue ?? ((v: number) => v.toFixed(2));

  // Slider drags don't block renders — only `layout.shapes` + annotations
  // depend on deferredThreshold, and those updates are cheap in Plotly.
  const deferredThreshold = useDeferredValue(threshold);

  const dataMax = useMemo(() => {
    let m = 0;
    for (const p of points) {
      const v = p.yValue ?? 0;
      if (v > m) m = v;
    }
    // Floor of 1 gives PIP data (0–1) a usable axis; larger datasets
    // (e.g. -log₁₀(p)) float above it naturally.
    return Math.max(1, m);
  }, [points]);

  const categories = useMemo(() => {
    const byCategory = new Map<string, TraitPoint[]>();
    for (const p of points) {
      const list = byCategory.get(p.category) ?? [];
      list.push(p);
      byCategory.set(p.category, list);
    }
    return Array.from(byCategory.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([id, pts], i) => ({
        id,
        label: formatCategoryLabel(id),
        count: pts.length,
        points: pts,
        color: PALETTE[i % PALETTE.length],
        xIndex: i,
      }));
  }, [points]);

  // Traces depend on data + yScale only. Threshold changes touch the layout
  // shapes instead, so 300+ customdata rows aren't rebuilt on every tick.
  const traces = useMemo<PlotData[]>(() => {
    const transformY =
      yScale === "sqrt"
        ? (v: number) => Math.sqrt(Math.max(0, v))
        : (v: number) => v;

    // Only show optional tooltip rows if ANY point carries that field.
    const showVariantCount = points.some((p) => p.variantCount != null);
    const showMethod = points.some((p) => p.method);
    const showStudyId = points.some((p) => p.studyId);
    const showGene = points.some((p) => p.mappedGene);
    const showRaf = points.some((p) => p.riskAlleleFreq != null);
    const showEffect = points.some((p) => p.orBeta != null);

    return categories.map((cat) => {
      const xs: number[] = [];
      const ys: number[] = [];
      // customdata indices:
      //  0 traitName, 1 category, 2 pScientific, 3 yDisplay, 4 raf,
      //  5 effectSize, 6 gene, 7 variantCount, 8 method, 9 studyId
      const customdata: string[][] = [];

      for (const p of cat.points) {
        const y = p.yValue;
        if (y == null) continue;
        xs.push(cat.xIndex + hashJitter(p.id) * 0.32);
        ys.push(transformY(y));
        customdata.push([
          p.traitName || "—",
          cat.label,
          showPValueInTooltip ? formatPScientific(y) : "—",
          formatY(y),
          p.riskAlleleFreq != null ? p.riskAlleleFreq.toFixed(3) : "—",
          p.orBeta != null ? p.orBeta.toFixed(3) : "—",
          p.mappedGene ?? "—",
          p.variantCount != null ? p.variantCount.toLocaleString() : "—",
          p.method ?? "—",
          p.studyId ?? "—",
        ]);
      }

      let hoverTemplate =
        (variantLabel ? `<b>${variantLabel}</b><br>` : "") +
        "<b>%{customdata[0]}</b><br>" +
        "<span style='color:#888'>Category:</span> %{customdata[1]}";
      if (showPValueInTooltip) {
        hoverTemplate +=
          "<br><span style='color:#888'>P-value:</span> %{customdata[2]}";
      }
      hoverTemplate += `<br><span style='color:#888'>${yMetricLabel}:</span> %{customdata[3]}`;
      if (showRaf) {
        hoverTemplate +=
          "<br><span style='color:#888'>RAF:</span> %{customdata[4]}";
      }
      if (showEffect) {
        hoverTemplate +=
          "<br><span style='color:#888'>Effect size:</span> %{customdata[5]}";
      }
      if (showGene) {
        hoverTemplate +=
          "<br><span style='color:#888'>Gene:</span> %{customdata[6]}";
      }
      if (showVariantCount) {
        hoverTemplate +=
          "<br><span style='color:#888'>Variants in set:</span> %{customdata[7]}";
      }
      if (showMethod) {
        hoverTemplate +=
          "<br><span style='color:#888'>Method:</span> %{customdata[8]}";
      }
      if (showStudyId) {
        hoverTemplate +=
          "<br><span style='color:#888'>Study:</span> %{customdata[9]}";
      }
      hoverTemplate += "<extra></extra>";

      return {
        type: "scatter",
        mode: "markers",
        name: `${cat.label} (${cat.count})`,
        x: xs,
        y: ys,
        customdata,
        marker: {
          color: cat.color,
          size: 7,
          opacity: 0.8,
          line: { width: 0 },
        },
        hovertemplate: hoverTemplate,
      } as PlotData;
    });
  }, [
    categories,
    yScale,
    variantLabel,
    points,
    showPValueInTooltip,
    yMetricLabel,
    formatY,
  ]);

  const yAxisTicks = useMemo(
    () => buildYTicks(yScale, dataMax),
    [yScale, dataMax],
  );

  const layout = useMemo<PlotLayout>((): PlotLayout => {
    const thresholdScaled =
      yScale === "sqrt"
        ? Math.sqrt(Math.max(0, deferredThreshold))
        : deferredThreshold;
    const catXMax = Math.max(0.5, categories.length - 0.5);

    return {
      height: CHART_HEIGHT,
      margin: { l: 52, r: 20, t: 12, b: 72 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      hovermode: "closest",
      xaxis: {
        type: "linear",
        tickvals: categories.map((c) => c.xIndex),
        ticktext: categories.map((c) => c.label),
        tickangle: -30,
        tickfont: { size: 11, color: "#6b7280" },
        showgrid: false,
        zeroline: false,
        range: [-0.7, catXMax],
        showspikes: true,
        spikemode: "across",
        spikedash: "dot",
        spikethickness: 1,
        spikecolor: "rgba(128,128,128,0.35)",
      },
      yaxis: {
        tickvals: yAxisTicks.tickvals,
        ticktext: yAxisTicks.ticktext,
        tickfont: { size: 10, color: "#6b7280" },
        gridcolor: "rgba(128,128,128,0.15)",
        gridwidth: 1,
        zeroline: false,
        showspikes: true,
        spikemode: "across",
        spikedash: "dot",
        spikethickness: 1,
        spikecolor: "rgba(128,128,128,0.35)",
        title: {
          text: yAxisLabel,
          font: { size: 11, color: "#6b7280" },
          standoff: 8,
        },
      },
      shapes: [
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          yref: "y",
          y0: thresholdScaled,
          y1: thresholdScaled,
          line: { color: "#e11d48", width: 1, dash: "dash" },
        },
      ],
      annotations: [
        {
          xref: "paper",
          x: 1,
          xanchor: "right",
          yref: "y",
          y: thresholdScaled,
          yanchor: "bottom",
          text: `Threshold ${formatY(deferredThreshold)}`,
          showarrow: false,
          font: { size: 10, color: "#e11d48" },
        },
      ],
      showlegend: true,
      legend: {
        orientation: "h",
        y: 1.06,
        yanchor: "bottom",
        x: 0,
        xanchor: "left",
        font: { size: 11 },
        itemsizing: "constant",
        bgcolor: "rgba(0,0,0,0)",
      },
      hoverlabel: {
        bgcolor: "#ffffff",
        bordercolor: "rgba(0,0,0,0.08)",
        font: { size: 12, color: "#111827" },
        align: "left",
      },
    };
  }, [categories, yAxisTicks, yScale, deferredThreshold, yAxisLabel, formatY]);

  // -- Render --

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">Loading…</div>
        </div>
        <div className="p-4">
          <div
            className="w-full bg-muted/40 rounded animate-pulse"
            style={{ height: CHART_HEIGHT }}
          />
        </div>
      </div>
    );
  }

  if (points.length === 0) return null;

  const defaultSubtitle = `${points.length.toLocaleString()} associations · ${categories.length} categories · drag to zoom, scroll to pan`;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header + controls */}
      <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle ?? defaultSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Scale</span>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {(["linear", "sqrt"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setYScale(mode)}
                  className={cn(
                    "px-2.5 py-0.5 text-[11px] transition-colors",
                    yScale === mode
                      ? "bg-foreground text-background"
                      : "bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "linear" ? "Linear" : "√"}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Threshold</span>
            <input
              type="range"
              min={0}
              max={thresholdMax}
              step={thresholdMax <= 1 ? 0.01 : 0.1}
              value={Math.min(threshold, thresholdMax)}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-24 accent-rose-500"
            />
            <span className="tabular-nums text-foreground w-9">
              {formatY(threshold)}
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              setYScale(defaultScale);
              setThreshold(defaultThreshold);
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Plot */}
      <div className="px-2 pb-2">
        <Plot
          data={traces}
          layout={layout}
          config={PLOT_CONFIG}
          style={PLOT_STYLE}
          useResizeHandler
        />
      </div>
    </div>
  );
}
