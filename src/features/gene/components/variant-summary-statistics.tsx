"use client";

import type { GeneVariantStatistics } from "@features/gene/api/variant-statistics";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Legend,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================================
// Types
// ============================================================================

interface VariantSummaryStatisticsProps {
  stats: GeneVariantStatistics | null;
  geneSymbol?: string;
}

interface StackedBarItem {
  name: string;
  snv: number;
  indel: number;
  total: number;
}

// ============================================================================
// Colors
// ============================================================================

const SNV_COLOR = "#8b5cf6"; // violet-500
const INDEL_COLOR = "#06b6d4"; // cyan-500

// ============================================================================
// Utility
// ============================================================================

function c(
  counts: Record<string, number> | undefined,
  key: string,
): number {
  if (!counts) return 0;
  return counts[key] ?? 0;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function row(
  counts: Record<string, number> | undefined,
  name: string,
  key: string,
): StackedBarItem {
  const total = c(counts, key);
  const snv = c(counts, `${key}Snv`);
  const indel = c(counts, `${key}Indel`);
  return { name, snv, indel, total };
}

// ============================================================================
// Chart Tooltip
// ============================================================================

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span>{p.name}: {fmt(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1 pt-1 text-xs font-medium text-foreground">
        Total: {fmt(total)}
      </div>
    </div>
  );
}

// ============================================================================
// Stat Metric — clean number with label, optional hint
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
      {sub && (
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  );
}

// ============================================================================
// Stacked Horizontal Bar Chart
// ============================================================================

function StackedBarChart({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: StackedBarItem[];
}) {
  const filteredData = data.filter((d) => d.total > 0);

  if (filteredData.length === 0) {
    return null;
  }

  const chartHeight = Math.max(180, filteredData.length * 40);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RechartsBarChart
            data={filteredData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            barCategoryGap="24%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              vertical={true}
              stroke="var(--border)"
            />
            <XAxis
              type="number"
              domain={[0, "auto"]}
              tickFormatter={(v) => fmt(v)}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<StackedTooltip />} />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            <Bar
              dataKey="snv"
              name="SNV"
              stackId="a"
              fill={SNV_COLOR}
              radius={[0, 0, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="indel"
              name="Indel"
              stackId="a"
              fill={INDEL_COLOR}
              radius={[0, 3, 3, 0]}
              barSize={18}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VariantSummaryStatistics({
  stats,
  geneSymbol,
}: VariantSummaryStatisticsProps) {
  const counts = stats?.counts;

  // ---- Overview ----
  const totalVariants = c(counts, "varTotal");
  const snvCount = c(counts, "varSnv");
  const indelCount = c(counts, "varIndel");
  const actionable = c(counts, "scoreActionable");
  const clinicalInterest = c(counts, "scoreClinicalInterest");

  // ---- Frequency Distribution ----
  const frequencyData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "Common", "freqCommon"),
      row(counts, "Low Frequency", "freqLow"),
      row(counts, "Rare", "freqRare"),
      row(counts, "Singleton", "freqSingleton"),
      row(counts, "Doubleton", "freqDoubleton"),
      row(counts, "Ultra-Rare", "freqUltraRare"),
    ],
    [counts],
  );

  // ---- Genomic Location ----
  const locationData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "Exonic", "locExonic"),
      row(counts, "Intronic", "locIntronic"),
      row(counts, "UTR", "locUtr"),
      row(counts, "Splicing", "locSplicing"),
      row(counts, "Upstream", "locUpstream"),
      row(counts, "Downstream", "locDownstream"),
      row(counts, "Intergenic", "locIntergenic"),
      row(counts, "ncRNA", "locNcrna"),
    ],
    [counts],
  );

  // ---- Functional Consequence ----
  const consequenceData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "Missense", "funcMissense"),
      row(counts, "Synonymous", "funcSynonymous"),
      row(counts, "Nonsense", "funcNonsense"),
      row(counts, "Frameshift", "funcFrameshift"),
      row(counts, "Inframe", "funcInframe"),
      row(counts, "Loss of Function", "funcLof"),
    ],
    [counts],
  );

  // ---- Clinical Significance ----
  const clinicalData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "Pathogenic", "clinPathogenic"),
      row(counts, "Likely Pathogenic", "clinLikelyPathogenic"),
      row(counts, "Uncertain", "clinUncertain"),
      row(counts, "Likely Benign", "clinLikelyBenign"),
      row(counts, "Benign", "clinBenign"),
      row(counts, "Conflicting", "clinConflicting"),
      row(counts, "Drug Response", "clinDrugResponse"),
    ],
    [counts],
  );

  // ---- Computational Predictions ----
  const predictionData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "SIFT Deleterious", "predSiftDeleterious"),
      row(counts, "PolyPhen Damaging", "predPolyphenDamaging"),
      row(counts, "CADD Phred > 20", "predCaddPhred20"),
      row(counts, "REVEL Pathogenic", "predRevelPathogenic"),
      row(counts, "AlphaMissense Pathogenic", "predAlphamissensePathogenic"),
      row(counts, "AlphaMissense Ambiguous", "predAlphamissenseAmbiguous"),
      row(counts, "AlphaMissense Benign", "predAlphamissenseBenign"),
      row(counts, "SpliceAI Affecting", "predSpliceaiAffecting"),
      row(counts, "MetaSVM Damaging", "predMetasvmDamaging"),
    ],
    [counts],
  );

  // ---- Regulatory ----
  const regulatoryData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "Enhancer", "regEnhancer"),
      row(counts, "Promoter", "regPromoter"),
    ],
    [counts],
  );

  // ---- aPC Composite Scores ----
  const apcData = useMemo<StackedBarItem[]>(
    () => [
      row(counts, "aPC Protein Function", "apcProteinFunction"),
      row(counts, "aPC Conservation", "apcConservation"),
      row(counts, "aPC Epigenetics Active", "apcEpigeneticsActive"),
      row(counts, "aPC Epigenetics Repressed", "apcEpigeneticsRepressed"),
      row(counts, "aPC Epigenetics Transcription", "apcEpigeneticsTranscription"),
      row(counts, "aPC Nucleotide Diversity", "apcNucleotideDiversity"),
      row(counts, "aPC Mutation Density", "apcMutationDensity"),
      row(counts, "aPC Transcription Factor", "apcTranscriptionFactor"),
      row(counts, "aPC Mappability", "apcMappability"),
    ],
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
            "this gene"
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Key Numbers ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatMetric
          label="Total Variants"
          value={fmt(totalVariants)}

        />
        <StatMetric
          label="SNVs"
          value={fmt(snvCount)}
          sub={pct(snvCount, totalVariants)}

        />
        <StatMetric
          label="Indels"
          value={fmt(indelCount)}
          sub={pct(indelCount, totalVariants)}

        />
        <StatMetric
          label="Clinical Interest"
          value={fmt(clinicalInterest)}

          hint={
            <div className="space-y-1.5">
              <p className="font-medium text-white">Variants meeting any of:</p>
              <ul>
                <li>ClinVar pathogenic or likely pathogenic</li>
                <li>COSMIC Tier 1 somatic mutation</li>
                <li>Computationally damaging (SIFT/PolyPhen) AND rare (AF &lt; 0.1%)</li>
              </ul>
            </div>
          }
        />
        <StatMetric
          label="Actionable"
          value={fmt(actionable)}

          hint={
            <div className="space-y-1.5">
              <p className="font-medium text-white">Clinically actionable variants:</p>
              <ul>
                <li>ClinVar pathogenic or likely pathogenic</li>
                <li>Rare allele frequency (AF &lt; 0.1%)</li>
                <li>Located in exonic (coding) regions</li>
              </ul>
              <p className="text-muted-foreground text-xs pt-1">All three criteria must be met.</p>
            </div>
          }
        />
      </div>

      {/* ── Distribution Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StackedBarChart
          title="Allele Frequency"
          description="Distribution by population frequency bin"
          data={frequencyData}
        />

        <StackedBarChart
          title="Genomic Location"
          description="Where variants fall relative to gene structure"
          data={locationData}
        />

        <StackedBarChart
          title="Functional Consequence"
          description="Predicted effect on protein coding"
          data={consequenceData}
        />

        <StackedBarChart
          title="ClinVar Significance"
          description="Clinical interpretation from ClinVar submissions"
          data={clinicalData}
        />

        <StackedBarChart
          title="Computational Predictions"
          description="In silico pathogenicity and splice predictors"
          data={predictionData}
        />

        <StackedBarChart
          title="Regulatory Elements"
          description="Overlap with CAGE-identified promoters and enhancers"
          data={regulatoryData}
        />

        <StackedBarChart
          title="aPC Composite Scores"
          description="Aggregate percentile contribution scores across domains"
          data={apcData}
        />
      </div>
    </div>
  );
}
