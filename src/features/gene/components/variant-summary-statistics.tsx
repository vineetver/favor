"use client";

import type { GeneVariantStatistics } from "@features/gene/api/variant-statistics";
import {
  Plot,
  PLOTLY_FONT,
  PLOTLY_CONFIG_STATIC,
} from "@shared/components/ui/charts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";

// ============================================================================
// Data
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

// ============================================================================
// Chart 1 — Sunburst: Genomic Location Hierarchy
//
// Shows WHERE variants land. Two rings:
//   inner: Coding / Non-coding / Regulatory context
//   outer: fine-grained annotation (Exonic, Intronic, UTR, …)
// ============================================================================

function LocationSunburst({ counts, total }: { counts: Counts; total: number }) {
  const cats = [
    { label: "Exonic", parent: "Coding", value: get(counts, "locExonic"), color: "#7c3aed" },
    { label: "Splicing", parent: "Coding", value: get(counts, "locSplicing"), color: "#a78bfa" },
    { label: "Intronic", parent: "Non-coding", value: get(counts, "locIntronic"), color: "#64748b" },
    { label: "Intergenic", parent: "Non-coding", value: get(counts, "locIntergenic"), color: "#94a3b8" },
    { label: "UTR", parent: "Regulatory", value: get(counts, "locUtr"), color: "#0891b2" },
    { label: "Upstream", parent: "Regulatory", value: get(counts, "locUpstream"), color: "#06b6d4" },
    { label: "Downstream", parent: "Regulatory", value: get(counts, "locDownstream"), color: "#22d3ee" },
    { label: "ncRNA", parent: "Non-coding", value: get(counts, "locNcrna"), color: "#cbd5e1" },
  ].filter((d) => d.value > 0);

  if (cats.length === 0) return null;

  // Build parent totals
  const parentMap: Record<string, number> = {};
  for (const c of cats) parentMap[c.parent] = (parentMap[c.parent] ?? 0) + c.value;

  const parentColors: Record<string, string> = {
    Coding: "#7c3aed",
    "Non-coding": "#64748b",
    Regulatory: "#0891b2",
  };

  const labels = [
    ...Object.keys(parentMap),
    ...cats.map((c) => c.label),
  ];
  const parents = [
    ...Object.keys(parentMap).map(() => ""),
    ...cats.map((c) => c.parent),
  ];
  const values = [
    ...Object.values(parentMap),
    ...cats.map((c) => c.value),
  ];
  const colors = [
    ...Object.keys(parentMap).map((k) => parentColors[k] ?? "#94a3b8"),
    ...cats.map((c) => c.color),
  ];

  return (
    <Plot
      data={[
        {
          type: "sunburst" as const,
          labels,
          parents,
          values,
          branchvalues: "total" as const,
          marker: { colors },
          textinfo: "label+percent",
          hovertemplate: "<b>%{label}</b><br>%{value:,} variants (%{percentRoot:.1%})<extra></extra>",
        },
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        height: 340,
        margin: { l: 0, r: 0, t: 0, b: 0 },
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Chart 2 — Stacked Bar: Consequence × SNV/Indel
//
// The ONE place stacking adds insight: frameshifts are indel-driven,
// nonsense is SNV-driven. Reveals mutation mechanism.
// ============================================================================

function ConsequenceChart({ counts }: { counts: Counts }) {
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
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Chart 3 — Radar: Functional Fingerprint
//
// aPC composite scores normalized to % of total variants.
// Reveals what functional domains characterize this region.
// A coding-rich gene locus looks different from an intergenic desert.
// ============================================================================

function FunctionalRadar({ counts, total }: { counts: Counts; total: number }) {
  if (total === 0) return null;

  const axes = [
    { label: "Protein Function", key: "apcProteinFunction" },
    { label: "Conservation", key: "apcConservation" },
    { label: "Epigenetics Active", key: "apcEpigeneticsActive" },
    { label: "Epigenetics Repressed", key: "apcEpigeneticsRepressed" },
    { label: "Epigenetics Transcription", key: "apcEpigeneticsTranscription" },
    { label: "Transcription Factor", key: "apcTranscriptionFactor" },
    { label: "Nucleotide Diversity", key: "apcNucleotideDiversity" },
    { label: "Mutation Density", key: "apcMutationDensity" },
    { label: "Mappability", key: "apcMappability" },
    { label: "Enhancer", key: "regEnhancer" },
    { label: "Promoter", key: "regPromoter" },
  ];

  const values = axes.map((a) => (get(counts, a.key) / total) * 100);
  const hasData = values.some((v) => v > 0);
  if (!hasData) return null;

  return (
    <Plot
      data={[
        {
          type: "scatterpolar" as const,
          r: [...values, values[0]], // close the polygon
          theta: [...axes.map((a) => a.label), axes[0].label],
          fill: "toself" as const,
          fillcolor: "rgba(124, 58, 237, 0.15)",
          line: { color: "#7c3aed", width: 2 },
          marker: { color: "#7c3aed", size: 5 },
          hovertemplate: "%{theta}: %{r:.1f}%<extra></extra>",
        },
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        height: 380,
        margin: { l: 60, r: 60, t: 30, b: 30 },
        polar: {
          radialaxis: {
            visible: true,
            ticksuffix: "%",
            tickfont: { size: 9 },
            gridcolor: "#e5e5e5",
            linecolor: "#e5e5e5",
          },
          angularaxis: {
            tickfont: { size: 10 },
            gridcolor: "#e5e5e5",
            linecolor: "#e5e5e5",
          },
          bgcolor: "transparent",
        },
        showlegend: false,
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Chart 4 — Lollipop: Prediction Tool Concordance
//
// Dot plot showing how many variants each tool flags.
// Tools that agree (similar counts) suggest real signal.
// Divergent tools suggest annotation-specific bias.
// ============================================================================

function PredictionLollipop({ counts, total }: { counts: Counts; total: number }) {
  const tools = [
    { label: "CADD Phred > 20", key: "predCaddPhred20" },
    { label: "SIFT Deleterious", key: "predSiftDeleterious" },
    { label: "PolyPhen Damaging", key: "predPolyphenDamaging" },
    { label: "AlphaMissense Pathogenic", key: "predAlphamissensePathogenic" },
    { label: "AlphaMissense Ambiguous", key: "predAlphamissenseAmbiguous" },
    { label: "REVEL Pathogenic", key: "predRevelPathogenic" },
    { label: "SpliceAI Affecting", key: "predSpliceaiAffecting" },
    { label: "MetaSVM Damaging", key: "predMetasvmDamaging" },
  ]
    .map((t) => ({ ...t, value: get(counts, t.key) }))
    .filter((t) => t.value > 0)
    .sort((a, b) => b.value - a.value);

  if (tools.length === 0) return null;

  const reversed = [...tools].reverse();

  // Stems (lines from 0 to value)
  const stems = reversed.map((t, i) => ({
    type: "line" as const,
    x0: 0,
    x1: t.value,
    y0: i,
    y1: i,
    line: { color: "#d4d4d8", width: 2 },
  })) as Partial<Plotly.Shape>[];

  return (
    <Plot
      data={[
        {
          type: "scatter" as const,
          mode: "markers" as const,
          x: reversed.map((t) => t.value),
          y: reversed.map((t) => t.label),
          marker: {
            color: "#7c3aed",
            size: 10,
            line: { color: "#ffffff", width: 2 },
          },
          hovertemplate: "<b>%{y}</b><br>%{x:,} variants (" +
            reversed.map((t) => pct(t.value, total)).join("|") +
            ")<extra></extra>",
          // Better hover: individual text per point
          text: reversed.map((t) => `${fmt(t.value)} (${pct(t.value, total)})`),
          hoverinfo: "text" as const,
        },
      ]}
      layout={{
        font: PLOTLY_FONT,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        height: Math.max(160, tools.length * 32 + 40),
        margin: { l: 160, r: 60, t: 5, b: 25 },
        xaxis: {
          showgrid: true,
          gridcolor: "#f0f0f0",
          showline: false,
          zeroline: false,
          tickfont: { size: 10 },
        },
        yaxis: { showline: false, showgrid: false, tickfont: { size: 11 } },
        shapes: stems,
        showlegend: false,
      }}
      config={PLOTLY_CONFIG_STATIC}
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Chart 5 — Diverging Bar: ClinVar Significance
//
// Pathogenic → right (red), Benign → left (green), Uncertain → center.
// Immediately shows clinical actionability balance.
// ============================================================================

function ClinvarDiverging({ counts }: { counts: Counts }) {
  const path = get(counts, "clinPathogenic");
  const likelyPath = get(counts, "clinLikelyPathogenic");
  const uncertain = get(counts, "clinUncertain");
  const conflicting = get(counts, "clinConflicting");
  const likelyBenign = get(counts, "clinLikelyBenign");
  const benign = get(counts, "clinBenign");
  const drugResponse = get(counts, "clinDrugResponse");

  const total = path + likelyPath + uncertain + conflicting + likelyBenign + benign + drugResponse;
  if (total === 0) return null;

  // Benign side (negative), pathogenic side (positive)
  const categories = ["Drug Response", "Benign", "Likely Benign", "Uncertain", "Conflicting", "Likely Pathogenic", "Pathogenic"];
  const values = [drugResponse, -benign, -likelyBenign, uncertain, conflicting, likelyPath, path];
  const colors = ["#3b82f6", "#16a34a", "#22c55e", "#ca8a04", "#94a3b8", "#f97316", "#dc2626"];

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
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Chart 6 — Allele Frequency Spectrum
//
// Simple bar chart but with meaning: the shape reveals selection.
// Rare-heavy = purifying selection. Common-heavy = neutral drift.
// ============================================================================

function FrequencySpectrum({ counts }: { counts: Counts }) {
  const bins = [
    { label: "Common\n(>5%)", value: get(counts, "freqCommon"), color: "#3b82f6" },
    { label: "Low Freq\n(1–5%)", value: get(counts, "freqLow"), color: "#6366f1" },
    { label: "Rare\n(0.1–1%)", value: get(counts, "freqRare"), color: "#8b5cf6" },
    { label: "Singleton", value: get(counts, "freqSingleton"), color: "#a855f7" },
    { label: "Doubleton", value: get(counts, "freqDoubleton"), color: "#c084fc" },
    { label: "Ultra-Rare\n(<0.1%)", value: get(counts, "freqUltraRare"), color: "#e879f9" },
  ].filter((b) => b.value > 0);

  if (bins.length === 0) return null;

  const total = bins.reduce((s, b) => s + b.value, 0);
  const rareAndBelow = bins
    .filter((b) => !b.label.startsWith("Common") && !b.label.startsWith("Low"))
    .reduce((s, b) => s + b.value, 0);
  const rarePct = total > 0 ? ((rareAndBelow / total) * 100).toFixed(0) : "0";

  return (
    <Plot
      data={[
        {
          type: "bar" as const,
          x: bins.map((b) => b.label),
          y: bins.map((b) => b.value),
          marker: { color: bins.map((b) => b.color) },
          hovertemplate: "%{x}: %{y:,} variants<extra></extra>",
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
        xaxis: { showline: false, showgrid: false, tickfont: { size: 10 } },
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
      style={{ width: "100%" }}
    />
  );
}

// ============================================================================
// Components
// ============================================================================

function StatMetric({
  label,
  value,
  sub,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
}

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
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

// ============================================================================
// Main
// ============================================================================

interface VariantSummaryStatisticsProps {
  stats: GeneVariantStatistics | null;
  geneSymbol?: string;
}

export function VariantSummaryStatistics({
  stats,
  geneSymbol,
}: VariantSummaryStatisticsProps) {
  const counts = stats?.counts;
  const total = get(counts, "varTotal");

  const hasConsequence = useMemo(
    () =>
      ["funcMissense", "funcSynonymous", "funcNonsense", "funcFrameshift", "funcInframe", "funcLof"].some(
        (k) => get(counts, k) > 0,
      ),
    [counts],
  );
  const hasClinvar = useMemo(
    () =>
      ["clinPathogenic", "clinLikelyPathogenic", "clinUncertain", "clinBenign", "clinLikelyBenign", "clinConflicting", "clinDrugResponse"].some(
        (k) => get(counts, k) > 0,
      ),
    [counts],
  );
  const hasPredictions = useMemo(
    () =>
      ["predCaddPhred20", "predSiftDeleterious", "predPolyphenDamaging", "predAlphamissensePathogenic", "predRevelPathogenic", "predSpliceaiAffecting", "predMetasvmDamaging"].some(
        (k) => get(counts, k) > 0,
      ),
    [counts],
  );
  const hasApc = useMemo(
    () =>
      ["apcProteinFunction", "apcConservation", "apcEpigeneticsActive", "apcEpigeneticsRepressed", "apcEpigeneticsTranscription", "apcTranscriptionFactor", "apcNucleotideDiversity", "apcMutationDensity", "apcMappability", "regEnhancer", "regPromoter"].some(
        (k) => get(counts, k) > 0,
      ),
    [counts],
  );

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-base font-medium text-foreground mb-1">
          No Statistics Available
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Variant statistics are not available for{" "}
          {geneSymbol ? (
            <span className="font-medium text-foreground">{geneSymbol}</span>
          ) : (
            "this entity"
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatMetric label="Total Variants" value={fmt(total)} />
        <StatMetric label="SNVs" value={fmt(get(counts, "varSnv"))} sub={pct(get(counts, "varSnv"), total)} />
        <StatMetric label="Indels" value={fmt(get(counts, "varIndel"))} sub={pct(get(counts, "varIndel"), total)} />
        <StatMetric
          label="Clinical Interest"
          value={fmt(get(counts, "scoreClinicalInterest"))}
          hint={
            <div className="space-y-1.5">
              <p className="font-medium text-white">Variants meeting any of:</p>
              <ul>
                <li>ClinVar pathogenic or likely pathogenic</li>
                <li>COSMIC Tier 1 somatic mutation</li>
                <li>Computationally damaging AND rare (AF &lt; 0.1%)</li>
              </ul>
            </div>
          }
        />
        <StatMetric
          label="Actionable"
          value={fmt(get(counts, "scoreActionable"))}
          hint={
            <div className="space-y-1.5">
              <p className="font-medium text-white">All three criteria must be met:</p>
              <ul>
                <li>ClinVar pathogenic or likely pathogenic</li>
                <li>Rare allele frequency (AF &lt; 0.1%)</li>
                <li>Located in exonic (coding) regions</li>
              </ul>
            </div>
          }
        />
      </div>

      {/* Row 1: Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Genomic Location"
          subtitle="Where variants land — coding, non-coding, or regulatory context"
        >
          <LocationSunburst counts={counts!} total={total} />
        </ChartCard>

        <ChartCard
          title="Allele Frequency Spectrum"
          subtitle="Distribution across frequency bins — shape reveals selection pressure"
        >
          <FrequencySpectrum counts={counts!} />
        </ChartCard>
      </div>

      {/* Row 2: Functional Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasConsequence && (
          <ChartCard
            title="Functional Consequence"
            subtitle="Exonic variant effects — stacking reveals mutation mechanism (SNV vs Indel)"
          >
            <ConsequenceChart counts={counts!} />
          </ChartCard>
        )}

        {hasClinvar && (
          <ChartCard
            title="Clinical Significance"
            subtitle="ClinVar annotations — diverging axis shows actionability balance"
          >
            <ClinvarDiverging counts={counts!} />
          </ChartCard>
        )}
      </div>

      {/* Row 3: Predictions + Fingerprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasPredictions && (
          <ChartCard
            title="Computational Predictions"
            subtitle="Tools flagging variants as damaging — concordance suggests real signal"
          >
            <PredictionLollipop counts={counts!} total={total} />
          </ChartCard>
        )}

        {hasApc && (
          <ChartCard
            title="Functional Fingerprint"
            subtitle="aPC domain enrichment — shows what characterizes this region"
          >
            <FunctionalRadar counts={counts!} total={total} />
          </ChartCard>
        )}
      </div>
    </div>
  );
}
