import type {
  RegionSummary,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import type { GenePromptContext, TissueStat } from "./build-gene-prompt";

/**
 * Transforms raw API responses into a compact GenePromptContext.
 * Pure function — no IO.
 */
export function buildGeneContext(raw: {
  regionSummary: RegionSummary | null;
  signals: TissueGroupRow[];
  chromatin: TissueGroupRow[];
  enhancers: TissueGroupRow[];
  accessibility: TissueGroupRow[];
  loops: TissueGroupRow[];
  ccreLinks: TissueGroupRow[];
  crispr: TissueGroupRow[];
}): GenePromptContext {
  return {
    regionCounts: raw.regionSummary?.counts,
    signalTissues: toTissueStats(raw.signals),
    chromatinTissues: toTissueStats(raw.chromatin),
    enhancerTissues: toTissueStats(raw.enhancers),
    accessibilityTissues: toTissueStats(raw.accessibility),
    loopTissues: toTissueStats(raw.loops),
    ccreLinkTissues: toTissueStats(raw.ccreLinks),
    crisprTissues: toTissueStats(raw.crispr),
  };
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
