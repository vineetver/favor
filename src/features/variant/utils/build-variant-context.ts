import type { GwasResult } from "@features/variant/api/gwas";
import type {
  RegionSummary,
  TargetGeneEvidence,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import type { VariantPromptContext, TissueStat } from "./build-variant-prompt";

/**
 * Transforms raw API responses into a compact VariantPromptContext
 * for the LLM prompt builder. Pure function — no IO.
 */
export function buildVariantContext(raw: {
  gwas: GwasResult | null;
  targetGenes: TargetGeneEvidence[];
  qtls: TissueGroupRow[];
  regionSummary: RegionSummary | null;
  signals: TissueGroupRow[];
  chromBpnet: TissueGroupRow[];
  allelicImbalance: TissueGroupRow[];
  methylation: TissueGroupRow[];
}): VariantPromptContext {
  return {
    gwas: compactGwas(raw.gwas),
    targetGenes: compactTargetGenes(raw.targetGenes),
    qtlTissues: toTissueStats(raw.qtls),
    regionCounts: raw.regionSummary?.counts,
    signalTissues: toTissueStats(raw.signals),
    chromBpnetTissues: toTissueStats(raw.chromBpnet),
    allelicImbalanceTissues: toTissueStats(raw.allelicImbalance),
    methylationTissues: toTissueStats(raw.methylation),
  };
}

function compactGwas(result: GwasResult | null) {
  if (!result?.data.length) return undefined;

  const sorted = [...result.data]
    .filter((r) => r.pvalueMlog != null)
    .sort((a, b) => (b.pvalueMlog ?? 0) - (a.pvalueMlog ?? 0));

  const seen = new Set<string>();
  const top: Array<{ trait: string; pvalue: number }> = [];
  for (const row of sorted) {
    const trait = row.trait || row.diseaseTrait || "Unknown";
    if (seen.has(trait)) continue;
    seen.add(trait);
    top.push({ trait, pvalue: row.pvalue ?? 10 ** -(row.pvalueMlog ?? 0) });
    if (top.length >= 5) break;
  }

  return {
    totalAssociations: result.meta?.totalCount ?? result.data.length,
    uniqueTraits: result.meta?.uniqueTraits ?? seen.size,
    uniqueStudies: result.meta?.uniqueStudies ?? 0,
    top,
  };
}

function compactTargetGenes(genes: TargetGeneEvidence[]) {
  if (!genes.length) return undefined;

  return genes.slice(0, 10).map((g) => ({
    gene: g.gene_symbol,
    evidence: g.evidence_count,
    significant: g.significant_count,
    tissues: g.tissue_count,
    sources: [...new Set(g.sources.map((s) => s.category))],
  }));
}

function toTissueStats(rows: TissueGroupRow[]): TissueStat[] | undefined {
  if (!rows.length) return undefined;

  return rows.map((r) => ({
    tissue: r.tissue_name,
    count: r.count,
    significant: r.significant,
    maxValue: r.max_value,
  }));
}
