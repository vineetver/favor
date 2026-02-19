/**
 * Compressed output types shared across agent tools.
 * These are the shapes returned to the LLM after compression.
 */

export interface CompressedSearchResult {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  score: number;
  matchTier?: string;
}

export interface CompressedGeneStats {
  gene: string;
  totalVariants: number;
  snvCount: number;
  indelCount: number;
  clinvar: {
    pathogenic: number;
    likelyPathogenic: number;
    benign: number;
    vus: number;
  };
  consequence: {
    missense: number;
    nonsense: number;
    frameshift: number;
    splice: number;
    synonymous: number;
  };
  frequency: {
    common: number;
    lowFreq: number;
    rare: number;
    ultraRare: number;
    unknown: number;
  };
  scores: {
    highCadd: number;
    highRevel: number;
    highAlphaMissense: number;
  };
}

export interface CompressedGwasAssociation {
  trait: string;
  pValueMlog: number;
  effectSize?: string;
  studyAccession?: string;
}

export interface CompressedNeighbor {
  entity: { type: string; id: string; label: string };
  rank: number;
  score?: number;
  explanation?: string;
}

export interface CompressedEnrichment {
  entity: { type: string; id: string; label: string };
  overlap: number;
  pValue: number;
  adjustedPValue: number;
  foldEnrichment: number;
}

export interface CompressedPath {
  rank: number;
  length: number;
  pathText: string;
  nodes: Array<{ type: string; id: string; label: string }>;
}

export interface CompressedCohort {
  cohortId: string;
  variantCount: number;
  resolution: { total: number; resolved: number; notFound: number };
  summary: string;
}

// ---------------------------------------------------------------------------
// Query routing + planning types
// ---------------------------------------------------------------------------

export type QueryType =
  | "entity_lookup"
  | "variant_analysis"
  | "graph_exploration"
  | "cohort_analysis"
  | "comparison"
  | "connection"
  | "drug_discovery"
  | "general";

export interface PlanItem {
  id: string;
  label: string;
  tools: string[];
}

export interface ReportPlanOutput {
  queryType: QueryType;
  plan: PlanItem[];
}

export interface SubagentOutput {
  summary: string;
  stepsUsed: number;
  toolCallsMade: number;
  toolsUsed: string[];
}
