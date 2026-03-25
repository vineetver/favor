"use client";

import { cn } from "@infra/utils";
import { createColumns } from "@infra/table/column-builder";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@shared/components/ui/button";
import { DataSurface } from "@shared/components/ui/data-surface";
import { apcColumns } from "@features/variant/config/hg38/columns/shared";
import { clinvarColumns } from "@features/variant/config/hg38/columns/clinvar";
import { spliceAiColumns } from "@features/variant/config/hg38/columns/splice-ai";
import { somaticMutationColumns } from "@features/variant/config/hg38/columns/somatic-mutation";
import { proteinFunctionColumns } from "@features/variant/config/hg38/columns/protein-function";
import { basicColumns } from "@features/variant/config/hg38/columns/basic";
import { functionalClassColumns } from "@features/variant/config/hg38/columns/functional-class";
import { integrativeColumns } from "@features/variant/config/hg38/columns/integrative";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import { useDuckDB } from "../hooks/use-duckdb";
import {
  generateReportData,
  AF_BINS,
  AF_COLORS,
  type AfByFunctionRow,
  type ChartSlice,
  type PrioritizedVariant,
  type RankedItem,
  type ReportData,
  type ScoreByRegulatoryPanel,
} from "../lib/report-queries";

// ============================================================================
// Chart theme — matches oklch design tokens as hex for SVG
// ============================================================================

const T = {
  fg: "#171717",
  muted: "#737373",
  grid: "#e8e8e8",
  axis: "#d4d4d4",
  primary: "#7c3aed",
  amber: "#d97706",
};

// ============================================================================
// Props
// ============================================================================

interface JobAnalyticsReportProps {
  dataUrl: string;
  jobId: string;
  filename?: string;
  className?: string;
}

// Recharts tooltip style — matches design system
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

// ============================================================================
// Chart Sub-Components
// ============================================================================

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

/**
 * Compact breakdown — colored dot + label + inline proportion bar + count.
 * Replaces donuts for categorical distributions where text is sufficient.
 */
function ProportionList({ data, total }: { data: ChartSlice[]; total: number }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        const barPct = (item.value / maxValue) * 100;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="text-foreground truncate">{item.name}</span>
              </div>
              <span className="text-muted-foreground tabular-nums shrink-0 ml-3">
                {item.value.toLocaleString()} <span className="text-muted-foreground/60">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: item.fill }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Ranked text list with subtle inline bars — replaces full Recharts bar charts.
 * Numbered list + name + monochrome proportion bar + count.
 */
function RankedList({ data }: { data: RankedItem[] }) {
  if (data.length === 0) return null;
  const items = data.slice(0, 10);
  const maxValue = Math.max(...items.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground/50 tabular-nums w-4 text-right shrink-0 text-xs">
            {i + 1}
          </span>
          <span className="text-foreground truncate min-w-0">{item.name}</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden shrink-0 min-w-12">
            <div
              className="h-full rounded-full bg-foreground/15"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground tabular-nums shrink-0">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Stacked bar chart — AF bin proportions within each functional category.
 * Like STAAR Figure 1: shows purifying selection across pLoF, Missense, etc.
 */
function StackedAfChart({ data }: { data: AfByFunctionRow[] }) {
  if (data.length === 0) return null;

  const bins = [...AF_BINS];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.grid} horizontal={true} vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: T.fg }}
          axisLine={{ stroke: T.axis }}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: T.muted }}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
          tickFormatter={(v: number) => v.toFixed(1)}
          label={{ value: "Proportion", angle: -90, position: "insideLeft", offset: -2, fontSize: 11, fill: T.muted }}
        />
        <ReTooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number | undefined, name: string | undefined) => [
            `${((v ?? 0) * 100).toFixed(1)}%`,
            name ?? "",
          ]}
        />
        {bins.map((bin) => (
          <Bar
            key={bin}
            dataKey={bin}
            stackId="af"
            fill={AF_COLORS[bin] ?? T.muted}
            barSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Faceted box plots — score distributions across regulatory categories.
 * 2×3 grid of mini box plots, each panel = one score.
 */
function FacetedBoxPlots({ panels }: { panels: ScoreByRegulatoryPanel[] }) {
  // Filter out panels where no box has meaningful spread (IQR ≈ 0 across all categories)
  const informative = panels.filter((p) =>
    p.boxes.some((b) => b.q1 != null && b.q3 != null && Math.abs((b.q3 ?? 0) - (b.q1 ?? 0)) > 0.5),
  );
  if (informative.length === 0) return null;

  const panelW = 380;
  const panelH = 260;
  const padL = 44;
  const padR = 12;
  const padT = 28;
  const padB = 56;
  const plotH = panelH - padT - padB;
  const boxW = 32;

  const fmt = (v: number | null) => {
    if (v == null) return "";
    return v < 1 ? v.toFixed(1) : v.toFixed(0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {informative.map((panel) => {
        const validBoxes = panel.boxes.filter((b) => b.median != null);
        if (validBoxes.length === 0) return null;

        const allVals = validBoxes.flatMap((b) =>
          [b.p5, b.q1, b.median, b.q3, b.p95].filter((v): v is number => v != null),
        );
        const yMax = Math.ceil(Math.max(...allVals, 1) / 5) * 5;
        const yScale = (v: number | null) => {
          if (v == null) return padT + plotH / 2;
          return padT + (1 - Math.min(v, yMax) / yMax) * plotH;
        };

        const colW = (panelW - padL - padR) / validBoxes.length;

        return (
          <div key={panel.score}>
            <svg viewBox={`0 0 ${panelW} ${panelH}`} className="w-full" style={{ maxWidth: panelW }}>
              {/* Panel title */}
              <text x={panelW / 2} y={18} textAnchor="middle" fontSize={13} fontWeight={600} style={{ fill: panel.color }}>
                {panel.score}
              </text>
              {/* Y gridlines */}
              {Array.from({ length: 4 }, (_, i) => {
                const val = (yMax / 4) * (i + 1);
                const gy = yScale(val);
                return (
                  <g key={i}>
                    <line x1={padL} y1={gy} x2={panelW - padR} y2={gy} stroke={T.grid} strokeDasharray="2 2" />
                    <text x={padL - 6} y={gy + 3} textAnchor="end" fontSize={10} style={{ fill: T.muted }}>{fmt(val)}</text>
                  </g>
                );
              })}
              <text x={padL - 6} y={yScale(0) + 3} textAnchor="end" fontSize={10} style={{ fill: T.muted }}>0</text>
              {/* Y axis */}
              <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={T.axis} />
              {/* X axis */}
              <line x1={padL} y1={padT + plotH} x2={panelW - padR} y2={padT + plotH} stroke={T.axis} />

              {validBoxes.map((box, j) => {
                const cx = padL + j * colW + colW / 2;
                return (
                  <g key={box.category}>
                    {/* Whisker */}
                    <line x1={cx} y1={yScale(box.p95)} x2={cx} y2={yScale(box.p5)} stroke={T.muted} strokeWidth={1} />
                    <line x1={cx - 8} y1={yScale(box.p5)} x2={cx + 8} y2={yScale(box.p5)} stroke={T.muted} strokeWidth={1} />
                    <line x1={cx - 8} y1={yScale(box.p95)} x2={cx + 8} y2={yScale(box.p95)} stroke={T.muted} strokeWidth={1} />
                    {/* IQR box */}
                    <rect
                      x={cx - boxW / 2}
                      y={yScale(box.q3)}
                      width={boxW}
                      height={Math.max(1, yScale(box.q1) - yScale(box.q3))}
                      fill={panel.color}
                      opacity={0.3}
                      stroke={panel.color}
                      strokeWidth={1}
                      rx={1}
                    />
                    {/* Median */}
                    <line
                      x1={cx - boxW / 2}
                      y1={yScale(box.median)}
                      x2={cx + boxW / 2}
                      y2={yScale(box.median)}
                      stroke={panel.color}
                      strokeWidth={2}
                    />
                    {/* Category label */}
                    <text
                      x={cx}
                      y={padT + plotH + 14}
                      textAnchor="end"
                      fontSize={10}
                      transform={`rotate(-35, ${cx}, ${padT + plotH + 14})`}
                      style={{ fill: T.muted }}
                    >
                      {box.category.replace("Non-regulatory", "Other")}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  pct,
  accent,
}: {
  label: string;
  value: number;
  pct?: number;
  accent?: "rose" | "amber" | "primary";
}) {
  const accentClass =
    accent === "rose"
      ? "text-rose-600"
      : accent === "amber"
        ? "text-amber-600"
        : accent === "primary"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className={cn("text-xl font-bold tabular-nums", accentClass)}>
        {value.toLocaleString()}
        {pct !== undefined && (
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({pct.toFixed(1)}%)
          </span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function KeyTakeaways({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">Key Findings</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="text-primary font-bold shrink-0">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Prioritized Variants Table
// ============================================================================

const col = createColumns<PrioritizedVariant>();

const scoreColumn = col.accessor("priority_score", {
  accessor: (row) => row.priority_score,
  header: "Score",
  cell: ({ getValue }) => {
    const v = getValue();
    if (v === null || v === undefined) return "—";
    return (
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
        {Math.round(Number(v))}
      </span>
    );
  },
});

const geneColumn = col.accessor("gene", {
  accessor: (row) => row.genecode?.genes,
  header: "Gene",
  cell: ({ getValue }) => {
    const genes = getValue();
    const arr = Array.isArray(genes) ? genes.filter(Boolean) : [];
    return arr.length ? (
      <span className="font-medium text-foreground">{arr.join(", ")}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  },
});

const prioritizedVariantColumns: ColumnDef<PrioritizedVariant>[] = [
  scoreColumn,
  basicColumns[0] as ColumnDef<PrioritizedVariant>,
  basicColumns[1] as ColumnDef<PrioritizedVariant>,
  geneColumn,
  functionalClassColumns[1] as ColumnDef<PrioritizedVariant>,
  functionalClassColumns[3] as ColumnDef<PrioritizedVariant>,
  clinvarColumns[0] as ColumnDef<PrioritizedVariant>,
  clinvarColumns[2] as ColumnDef<PrioritizedVariant>,
  clinvarColumns[4] as ColumnDef<PrioritizedVariant>,
  proteinFunctionColumns[1] as ColumnDef<PrioritizedVariant>,
  proteinFunctionColumns[2] as ColumnDef<PrioritizedVariant>,
  proteinFunctionColumns[3] as ColumnDef<PrioritizedVariant>,
  basicColumns[4] as ColumnDef<PrioritizedVariant>,
  basicColumns[2] as ColumnDef<PrioritizedVariant>,
  basicColumns[7] as ColumnDef<PrioritizedVariant>,
  basicColumns[6] as ColumnDef<PrioritizedVariant>,
  basicColumns[5] as ColumnDef<PrioritizedVariant>,
  functionalClassColumns[4] as ColumnDef<PrioritizedVariant>,
  functionalClassColumns[5] as ColumnDef<PrioritizedVariant>,
  functionalClassColumns[6] as ColumnDef<PrioritizedVariant>,
  integrativeColumns[10] as ColumnDef<PrioritizedVariant>,
  integrativeColumns[11] as ColumnDef<PrioritizedVariant>,
  apcColumns.proteinFunction as ColumnDef<PrioritizedVariant>,
  apcColumns.conservation as ColumnDef<PrioritizedVariant>,
  apcColumns.epigeneticsActive as ColumnDef<PrioritizedVariant>,
  spliceAiColumns[0] as ColumnDef<PrioritizedVariant>,
  somaticMutationColumns[0] as ColumnDef<PrioritizedVariant>,
  somaticMutationColumns[1] as ColumnDef<PrioritizedVariant>,
];

// ============================================================================
// Main Component
// ============================================================================

export function JobAnalyticsReport({
  dataUrl,
  jobId,
  filename: _filename,
  className,
}: JobAnalyticsReportProps) {
  const { query, loadParquet, isLoading: dbLoading, isReady, error: dbError } = useDuckDB();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || dataLoaded) return;
    loadParquet(dataUrl, "variants", `cohort:${jobId}:data`)
      .then(() => setDataLoaded(true))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      });
  }, [isReady, dataUrl, loadParquet, dataLoaded, jobId]);

  const runReport = useCallback(async () => {
    if (!dataLoaded) return;
    setIsLoading(true);
    setError(null);
    try {
      setReport(await generateReportData(query));
    } catch (err) {
      console.error("Report generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  }, [query, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) runReport();
  }, [dataLoaded, runReport]);

  // Loading
  if (dbLoading || !dataLoaded || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-foreground">
          {dbLoading
            ? "Initializing analytics engine..."
            : !dataLoaded
              ? "Loading data..."
              : "Generating report..."}
        </p>
      </div>
    );
  }

  // Error
  if (error || dbError) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-2">Report generation failed</p>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error || dbError}</p>
        <Button variant="outline" onClick={runReport}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!report) return null;
  const s = report.summary;

  return (
    <div className={cn("max-w-5xl mx-auto space-y-10 print:max-w-none", className)}>
      {/* ================================================================ */}
      {/* Executive Summary */}
      {/* ================================================================ */}
      <section>
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-foreground tabular-nums">
            {report.totalVariants.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">variants analyzed</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <Metric label="ClinVar P/LP" value={s.clinvarPLP.count} pct={s.clinvarPLP.pct} accent={s.clinvarPLP.count > 0 ? "rose" : undefined} />
          <Metric label="Ultra-rare (AF < 0.1%)" value={s.ultraRare.count} pct={s.ultraRare.pct} />
          <Metric label="High-impact (top 1%)" value={s.highImpact.count} pct={s.highImpact.pct} />
          <Metric label="COSMIC hits" value={s.cosmicHits} accent={s.cosmicHits > 0 ? "amber" : undefined} />
          <Metric label="Splice-disrupting" value={s.spliceHigh} accent={s.spliceHigh > 0 ? "amber" : undefined} />
          <Metric label="Regulatory active" value={s.regulatoryActive.count} pct={s.regulatoryActive.pct} />
          {s.qcPassPct !== null && (
            <Metric label="QC PASS rate" value={Math.round(s.qcPassPct)} pct={s.qcPassPct} accent={s.qcPassPct >= 95 ? "primary" : "amber"} />
          )}
        </div>

        <KeyTakeaways items={report.takeaways} />
      </section>

      {/* ================================================================ */}
      {/* Variant Classification */}
      {/* ================================================================ */}
      {(report.regionType.length > 0 || report.consequence.length > 0) && (
        <section>
          <SectionHeading
            title="Variant Classification"
            subtitle="Genomic region and exonic consequence breakdown"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {report.regionType.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Genomic Region
                </h3>
                <ProportionList data={report.regionType} total={report.totalVariants} />
              </div>
            )}
            {report.consequence.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Exonic Consequence
                </h3>
                <ProportionList data={report.consequence} total={report.consequence.reduce((s, d) => s + d.value, 0)} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* Functional Analysis */}
      {/* ================================================================ */}
      <section className="space-y-10">
        <SectionHeading
          title="Functional Analysis"
          subtitle="Cross-tabulations and score distributions revealing biological constraint and regulatory enrichment"
        />

        {report.afByFunction.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Allele Frequency by Functional Category
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Normalized AF composition within each functional class — enrichment of rare variants signals purifying selection
            </p>
            <StackedAfChart data={report.afByFunction} />
          </div>
        )}

        {report.scoresByRegulatory.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Score Distributions by Regulatory Context
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Variants in regulatory regions (CAGE, GeneHancer) vs. non-regulatory — higher scores indicate functional constraint
            </p>
            <FacetedBoxPlots panels={report.scoresByRegulatory} />
          </div>
        )}

        {(report.topGenes.length > 0 || report.geneHancerTargets.length > 0) && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">
              Gene Variant Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {report.topGenes.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">
                    Top Genes by Variant Count
                  </h4>
                  <RankedList data={report.topGenes} />
                </div>
              )}
              {report.geneHancerTargets.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">
                    GeneHancer Regulatory Targets
                  </h4>
                  <RankedList data={report.geneHancerTargets} />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* Clinical Evidence */}
      {/* ================================================================ */}
      {report.totalWithClinvar > 0 && (
        <section>
          <SectionHeading
            title="Clinical Evidence"
            subtitle={`${report.totalWithClinvar.toLocaleString()} variants with ClinVar annotations`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.clinvarSignificance.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Clinical Significance
                </h3>
                <div className="space-y-1.5">
                  {report.clinvarSignificance.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="text-foreground">{item.name}</span>
                      <span className="text-muted-foreground tabular-nums ml-auto">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.clinvarReviewStatus.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Review Status
                </h3>
                <div className="space-y-1.5">
                  {report.clinvarReviewStatus.map((item) => {
                    const pct = report.totalWithClinvar > 0 ? (item.value / report.totalWithClinvar) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                        <span className="text-foreground truncate">{item.name}</span>
                        <span className="text-muted-foreground tabular-nums ml-auto shrink-0">
                          {item.value.toLocaleString()}
                          <span className="text-muted-foreground/60 ml-1">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {report.topDiseases.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Top Associated Diseases
              </h3>
              <RankedList data={report.topDiseases} />
            </div>
          )}
        </section>
      )}

      {/* ================================================================ */}
      {/* Protein Impact */}
      {/* ================================================================ */}
      {report.totalMissense > 0 && (
        <section>
          <SectionHeading
            title="Protein Impact"
            subtitle={`${report.totalMissense.toLocaleString()} missense variants — AlphaMissense classification and gene-level burden`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {report.alphaMissense.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  AlphaMissense Classification
                </h3>
                <ProportionList
                  data={report.alphaMissense}
                  total={report.alphaMissense.reduce((s, d) => s + d.value, 0)}
                />
              </div>
            )}
            {report.topMissenseGenes.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Top Genes by Missense Variants
                </h3>
                <RankedList data={report.topMissenseGenes} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* Priority Variants */}
      {/* ================================================================ */}
      {report.prioritizedVariants.length > 0 && (
        <section>
          <DataSurface
            columns={prioritizedVariantColumns}
            data={report.prioritizedVariants}
            title={`Prioritized Variants (Top ${report.prioritizedVariants.length})`}
            subtitle="Score = ClinVar (+1000) + COSMIC (+200) + aPC protein×20 + aPC conservation×10 + AlphaMissense×100"
            searchable={false}
            exportable={false}
            pageSizeOptions={[5, 10, 20]}
            defaultPageSize={5}
          />
        </section>
      )}

      {/* ================================================================ */}
      {/* Footer */}
      {/* ================================================================ */}
      <footer className="pt-6 border-t border-border text-xs text-muted-foreground print:mt-8">
        <p>
          Data sources: ClinVar, gnomAD v4, BRAVO, AlphaMissense, ENCODE cCRE, COSMIC. Build:
          GRCh38/hg38.
        </p>
      </footer>
    </div>
  );
}
