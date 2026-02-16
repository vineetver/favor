"use client";

import type { GeneVariantStatistics } from "@features/gene/api/variant-statistics";
import {
  SummaryCard,
  SummarySection,
} from "@features/variant/components/open-targets/summary-card";
import { BarChart, type ChartDataRow } from "@shared/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Activity,
  AlertTriangle,
  Beaker,
  Dna,
  FlaskConical,
  HeartPulse,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

interface VariantSummaryStatisticsProps {
  stats: GeneVariantStatistics | null;
  geneSymbol?: string;
}

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

function chartRow(
  counts: Record<string, number> | undefined,
  id: string,
  label: string,
): ChartDataRow {
  return { id, label, value: c(counts, id) };
}

// ============================================================================
// Chart Section Wrapper
// ============================================================================

function ChartSection({
  title,
  icon,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  data: ChartDataRow[];
}) {
  const filteredData = data.filter((d) => d.value !== null && d.value > 0);

  if (filteredData.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart
          data={filteredData}
          layout="horizontal"
          showLegend={false}
          valueFormatter={(v) => fmt(v)}
        />
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

  // ---- Frequency Distribution ----
  const frequencyData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "freqCommon", "Common"),
      chartRow(counts, "freqLow", "Low Frequency"),
      chartRow(counts, "freqRare", "Rare"),
      chartRow(counts, "freqSingleton", "Singleton"),
      chartRow(counts, "freqDoubleton", "Doubleton"),
      chartRow(counts, "freqUltraRare", "Ultra-Rare"),
    ],
    [counts],
  );

  // ---- Genomic Location ----
  const locationData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "locExonic", "Exonic"),
      chartRow(counts, "locIntronic", "Intronic"),
      chartRow(counts, "locUtr", "UTR"),
      chartRow(counts, "locSplicing", "Splicing"),
      chartRow(counts, "locUpstream", "Upstream"),
      chartRow(counts, "locDownstream", "Downstream"),
      chartRow(counts, "locIntergenic", "Intergenic"),
      chartRow(counts, "locNcrna", "ncRNA"),
    ],
    [counts],
  );

  // ---- Functional Consequence ----
  const consequenceData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "funcMissense", "Missense"),
      chartRow(counts, "funcSynonymous", "Synonymous"),
      chartRow(counts, "funcNonsense", "Nonsense"),
      chartRow(counts, "funcFrameshift", "Frameshift"),
      chartRow(counts, "funcInframe", "Inframe"),
      chartRow(counts, "funcLof", "Loss of Function"),
    ],
    [counts],
  );

  // ---- Clinical Significance ----
  const clinicalData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "clinPathogenic", "Pathogenic"),
      chartRow(counts, "clinLikelyPathogenic", "Likely Pathogenic"),
      chartRow(counts, "clinUncertain", "Uncertain"),
      chartRow(counts, "clinLikelyBenign", "Likely Benign"),
      chartRow(counts, "clinBenign", "Benign"),
      chartRow(counts, "clinConflicting", "Conflicting"),
      chartRow(counts, "clinDrugResponse", "Drug Response"),
    ],
    [counts],
  );

  // ---- Computational Predictions ----
  const predictionData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "predSiftDeleterious", "SIFT Deleterious"),
      chartRow(counts, "predPolyphenDamaging", "PolyPhen Damaging"),
      chartRow(counts, "predCaddPhred20", "CADD Phred > 20"),
      chartRow(counts, "predRevelPathogenic", "REVEL Pathogenic"),
      chartRow(counts, "predAlphamissensePathogenic", "AlphaMissense Pathogenic"),
      chartRow(counts, "predAlphamissenseAmbiguous", "AlphaMissense Ambiguous"),
      chartRow(counts, "predAlphamissenseBenign", "AlphaMissense Benign"),
      chartRow(counts, "predSpliceaiAffecting", "SpliceAI Affecting"),
      chartRow(counts, "predMetasvmDamaging", "MetaSVM Damaging"),
    ],
    [counts],
  );

  // ---- Regulatory ----
  const regulatoryData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "regEnhancer", "Enhancer"),
      chartRow(counts, "regPromoter", "Promoter"),
    ],
    [counts],
  );

  // ---- aPC Composite Scores ----
  const apcData = useMemo<ChartDataRow[]>(
    () => [
      chartRow(counts, "apcProteinFunction", "aPC Protein Function"),
      chartRow(counts, "apcConservation", "aPC Conservation"),
      chartRow(counts, "apcEpigeneticsActive", "aPC Epigenetics Active"),
      chartRow(counts, "apcEpigeneticsRepressed", "aPC Epigenetics Repressed"),
      chartRow(counts, "apcEpigeneticsTranscription", "aPC Epigenetics Transcription"),
      chartRow(counts, "apcNucleotideDiversity", "aPC Nucleotide Diversity"),
      chartRow(counts, "apcMutationDensity", "aPC Mutation Density"),
      chartRow(counts, "apcTranscriptionFactor", "aPC Transcription Factor"),
      chartRow(counts, "apcMappability", "aPC Mappability"),
    ],
    [counts],
  );

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          No Statistics Available
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Variant statistics are not available for{" "}
          {geneSymbol ? (
            <span className="font-medium">{geneSymbol}</span>
          ) : (
            "this gene"
          )}
          . This may be because the gene has not been processed yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <SummarySection
        title="Variant Overview"
        description={`Pre-aggregated variant counts for ${geneSymbol || stats.geneSymbol || stats.gene_symbol} on chromosome ${stats.chromosome}`}
      >
        <SummaryCard
          icon={<Dna className="h-4 w-4" />}
          title="Total Variants"
          value={fmt(totalVariants)}
          color="purple"
        />
        <SummaryCard
          icon={<Sparkles className="h-4 w-4" />}
          title="SNVs"
          value={fmt(snvCount)}
          description={
            totalVariants > 0
              ? `${((snvCount / totalVariants) * 100).toFixed(1)}% of total`
              : undefined
          }
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          title="Indels"
          value={fmt(indelCount)}
          description={
            totalVariants > 0
              ? `${((indelCount / totalVariants) * 100).toFixed(1)}% of total`
              : undefined
          }
        />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Clinically Actionable"
          value={fmt(actionable)}
          color="emerald"
        />
      </SummarySection>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSection
          title="Allele Frequency Distribution"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          data={frequencyData}
        />

        <ChartSection
          title="Genomic Location"
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          data={locationData}
        />

        <ChartSection
          title="Functional Consequence"
          icon={<Dna className="h-4 w-4 text-muted-foreground" />}
          data={consequenceData}
        />

        <ChartSection
          title="ClinVar Significance"
          icon={<HeartPulse className="h-4 w-4 text-muted-foreground" />}
          data={clinicalData}
        />

        <ChartSection
          title="Computational Predictions"
          icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
          data={predictionData}
        />

        <ChartSection
          title="Regulatory Elements"
          icon={<Beaker className="h-4 w-4 text-muted-foreground" />}
          data={regulatoryData}
        />

        <ChartSection
          title="aPC Composite Scores"
          icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          data={apcData}
        />
      </div>
    </div>
  );
}
