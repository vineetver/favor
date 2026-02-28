/**
 * Deterministic visualization specs generated from tool results.
 * The LLM never sees these — they're pure post-processing for the UI.
 */

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

interface VizSpecBase {
  /** Links to toolTrace index for provenance */
  toolCallIndex: number;
  /** Auto-generated chart title */
  title: string;
}

// ---------------------------------------------------------------------------
// Bar chart — ranked scores, counts, GWAS p-values
// ---------------------------------------------------------------------------

export interface BarChartVizSpec extends VizSpecBase {
  type: "bar_chart";
  data: Array<{
    id: string;
    label: string;
    value: number;
    category?: string; // entity type for categorical coloring
  }>;
  valueLabel: string; // axis label (e.g., "Score", "-log10(p)", "Count")
  layout: "horizontal" | "vertical";
}

// ---------------------------------------------------------------------------
// Enrichment plot — horizontal bars with -log10(adjP) + fold enrichment
// ---------------------------------------------------------------------------

export interface EnrichmentVizSpec extends VizSpecBase {
  type: "enrichment_plot";
  data: Array<{
    id: string;
    label: string;
    negLogAdjP: number;
    foldEnrichment: number;
    overlap: number;
    overlappingGenes: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Mini network — small subgraph from paths/traversal
// ---------------------------------------------------------------------------

export interface NetworkVizSpec extends VizSpecBase {
  type: "network";
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    isSeed: boolean;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

// ---------------------------------------------------------------------------
// Stat card — summary numbers (correlation, counts)
// ---------------------------------------------------------------------------

export interface StatCardVizSpec extends VizSpecBase {
  type: "stat_card";
  stats: Array<{
    label: string;
    value: string | number;
    subtitle?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Distribution — multiple category breakdowns
// ---------------------------------------------------------------------------

export interface DistributionVizSpec extends VizSpecBase {
  type: "distribution";
  groups: Array<{
    label: string;
    data: Array<{
      id: string;
      label: string;
      value: number;
    }>;
  }>;
}

// ---------------------------------------------------------------------------
// Comparison — entity comparison table
// ---------------------------------------------------------------------------

export interface ComparisonVizSpec extends VizSpecBase {
  type: "comparison";
  entities: Array<{ type: string; id: string; label: string }>;
  overallSimilarity?: number;
  rows: Array<{
    edgeType: string;
    sharedCount: number;
    uniqueCounts: Record<string, number>; // keyed by entity label
  }>;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type VizSpec =
  | BarChartVizSpec
  | EnrichmentVizSpec
  | NetworkVizSpec
  | StatCardVizSpec
  | DistributionVizSpec
  | ComparisonVizSpec;
