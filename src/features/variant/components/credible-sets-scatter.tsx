"use client";

import {
  Plot,
  type PlotParams,
} from "@shared/components/ui/charts/plotly-chart";
import { useMemo } from "react";
import type { TraitPoint } from "../api/gwas-graph";

// ---------------------------------------------------------------------------
// Types (derived from react-plotly.js — plotly.js types unresolvable because
// the project installs plotly.js-dist-min rather than plotly.js)
// ---------------------------------------------------------------------------

type PlotData = PlotParams["data"][number];
type PlotLayout = PlotParams["layout"];
type PlotConfig = NonNullable<PlotParams["config"]>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_HEIGHT = 460;

// Quadrant anchors
const SET_SIZE_NARROW = 10; // below this = "tight" set
const PIP_CONFIDENT = 0.5; // above this = "likely causal"

// Color palette — colorblind-tolerant, matches TraitScatterPlot
const PALETTE = [
  "#f97316", // orange
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#eab308", // yellow
  "#ec4899", // pink
];

const STUDY_TYPE_LABELS: Record<string, string> = {
  gwas: "GWAS",
  eqtl: "eQTL",
  pqtl: "pQTL",
  sqtl: "sQTL",
  tuqtl: "tuQTL",
  sceqtl: "sc-eQTL",
  other: "Other",
};

function formatStudyType(t: string): string {
  return STUDY_TYPE_LABELS[t] ?? t;
}

// Deterministic hash → value in [-1, 1] for jittering stacked points
function hashJitter(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 500 - 1;
}

// Stable Plotly references — prevents re-mount on every parent render
const PLOT_CONFIG: PlotConfig = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: true,
};
const PLOT_STYLE = { width: "100%" } as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CredibleSetsScatterProps {
  points: TraitPoint[];
  isLoading?: boolean;
  variantLabel?: string;
}

export function CredibleSetsScatter({
  points,
  isLoading = false,
  variantLabel = "",
}: CredibleSetsScatterProps) {
  // Keep only rows with both PIP and set-size populated — rest can't be plotted
  const plottable = useMemo(
    () =>
      points.filter(
        (p) => p.yValue != null && p.variantCount != null && p.variantCount > 0,
      ),
    [points],
  );

  // Group by study type (category) for one Plotly trace per group — gives us
  // built-in legend toggle and per-category color for free
  const groups = useMemo(() => {
    const byCategory = new Map<string, TraitPoint[]>();
    for (const p of plottable) {
      const list = byCategory.get(p.category) ?? [];
      list.push(p);
      byCategory.set(p.category, list);
    }
    return Array.from(byCategory.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([id, pts], i) => ({
        id,
        label: formatStudyType(id),
        points: pts,
        color: PALETTE[i % PALETTE.length],
      }));
  }, [plottable]);

  // Build traces. Each point is jittered slightly so integer set sizes and
  // PIP=1.0 points don't collapse onto each other.
  const traces = useMemo<PlotData[]>(() => {
    return groups.map((g) => {
      const xs: number[] = [];
      const ys: number[] = [];
      // [0] trait, [1] studyType label, [2] PIP, [3] set size, [4] method,
      // [5] study id, [6] log BF
      const customdata: string[][] = [];

      for (const p of g.points) {
        const cs = p.variantCount as number;
        const pip = p.yValue as number;
        // Jitter: ±8% in log-x space, ±0.012 in PIP space
        const hx = hashJitter(p.id);
        const hy = hashJitter(`${p.id}-y`);
        const jitteredSize = cs * 10 ** (hx * 0.04);
        const jitteredPip = Math.min(1, Math.max(0, pip + hy * 0.012));
        xs.push(jitteredSize);
        ys.push(jitteredPip);
        customdata.push([
          p.traitName || p.studyId || "—",
          g.label,
          pip.toFixed(3),
          cs.toLocaleString(),
          p.method ?? "—",
          p.studyId ?? "—",
          // log BF isn't on TraitPoint today — leave blank, hover template
          // will just not render if we don't pass it. Add a dash for now.
          "—",
        ]);
      }

      return {
        type: "scatter",
        mode: "markers",
        name: `${g.label} (${g.points.length})`,
        x: xs,
        y: ys,
        customdata,
        marker: {
          color: g.color,
          size: 7,
          opacity: 0.75,
          line: { width: 0 },
        },
        hovertemplate:
          (variantLabel ? `<b>${variantLabel}</b><br>` : "") +
          "<b>%{customdata[0]}</b><br>" +
          "<span style='color:#888'>Study type:</span> %{customdata[1]}<br>" +
          "<span style='color:#888'>PIP:</span> %{customdata[2]}<br>" +
          "<span style='color:#888'>Set size:</span> %{customdata[3]}<br>" +
          "<span style='color:#888'>Method:</span> %{customdata[4]}<br>" +
          "<span style='color:#888'>Study:</span> %{customdata[5]}" +
          "<extra></extra>",
      } as PlotData;
    });
  }, [groups, variantLabel]);

  // Layout — log x, linear y, quadrant lines, corner annotations
  const layout = useMemo<PlotLayout>(() => {
    // Compute x range that covers the data with a bit of padding on both ends
    let dmax = 1;
    for (const p of plottable) {
      if (p.variantCount != null && p.variantCount > dmax)
        dmax = p.variantCount;
    }
    // Plotly log axis uses log10 internally; range is in log10 units
    const logMin = -0.1; // show a bit left of 1
    const logMax = Math.log10(Math.max(10, dmax * 1.3));

    return {
      height: CHART_HEIGHT,
      margin: { l: 56, r: 28, t: 16, b: 56 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      hovermode: "closest",
      xaxis: {
        type: "log",
        range: [logMin, logMax],
        title: {
          text: "Credible set size (variants)",
          font: { size: 11, color: "#6b7280" },
          standoff: 10,
        },
        tickfont: { size: 10, color: "#6b7280" },
        gridcolor: "rgba(128,128,128,0.15)",
        zeroline: false,
        showspikes: true,
        spikemode: "across",
        spikedash: "dot",
        spikethickness: 1,
        spikecolor: "rgba(128,128,128,0.35)",
      },
      yaxis: {
        type: "linear",
        range: [-0.04, 1.06],
        title: {
          text: "Posterior inclusion probability (PIP)",
          font: { size: 11, color: "#6b7280" },
          standoff: 8,
        },
        tickfont: { size: 10, color: "#6b7280" },
        tickvals: [0, 0.25, 0.5, 0.75, 1],
        gridcolor: "rgba(128,128,128,0.15)",
        zeroline: false,
        showspikes: true,
        spikemode: "across",
        spikedash: "dot",
        spikethickness: 1,
        spikecolor: "rgba(128,128,128,0.35)",
      },
      shapes: [
        // Quadrant lines — neutral, dashed
        {
          type: "line",
          xref: "x",
          x0: Math.log10(SET_SIZE_NARROW),
          x1: Math.log10(SET_SIZE_NARROW),
          yref: "paper",
          y0: 0,
          y1: 1,
          line: { color: "rgba(100,116,139,0.4)", width: 1, dash: "dash" },
        },
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          yref: "y",
          y0: PIP_CONFIDENT,
          y1: PIP_CONFIDENT,
          line: { color: "rgba(100,116,139,0.4)", width: 1, dash: "dash" },
        },
      ],
      annotations: [
        // Purely positional descriptors — no editorial language, neutral color
        {
          xref: "paper",
          yref: "paper",
          x: 0.02,
          y: 0.97,
          xanchor: "left",
          yanchor: "top",
          text: "well fine-mapped",
          showarrow: false,
          font: { size: 10, color: "#475569" },
        },
        {
          xref: "paper",
          yref: "paper",
          x: 0.98,
          y: 0.97,
          xanchor: "right",
          yanchor: "top",
          text: "wide locus",
          showarrow: false,
          font: { size: 10, color: "#94a3b8" },
        },
        {
          xref: "paper",
          yref: "paper",
          x: 0.02,
          y: 0.03,
          xanchor: "left",
          yanchor: "bottom",
          text: "tight, uncertain",
          showarrow: false,
          font: { size: 10, color: "#94a3b8" },
        },
        {
          xref: "paper",
          yref: "paper",
          x: 0.98,
          y: 0.03,
          xanchor: "right",
          yanchor: "bottom",
          text: "weak signal",
          showarrow: false,
          font: { size: 10, color: "#94a3b8" },
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
  }, [plottable]);

  // -- Render --

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <div className="text-sm font-medium text-foreground">
            Fine-mapped credible sets
          </div>
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

  if (plottable.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <h3 className="text-sm font-medium text-foreground">
          Fine-mapped credible sets
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each dot = one credible set membership. Top-left = well fine-mapped
          (small set, high PIP). Drag to zoom, scroll to pan.
        </p>
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
