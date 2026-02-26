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
    likelyBenign: number;
    vus: number;
    conflicting: number;
  };
  consequence: {
    lof: number;
    missense: number;
    nonsense: number;
    frameshift: number;
    inframe: number;
    splice: number;
    synonymous: number;
  };
  location: {
    exonic: number;
    intronic: number;
    utr: number;
    splicing: number;
    regulatory: number;
  };
  frequency: {
    common: number;
    lowFreq: number;
    rare: number;
    ultraRare: number;
    singleton: number;
  };
  scores: {
    highCadd: number;
    highRevel: number;
    highAlphaMissense: number;
    splicingAffecting: number;
    siftDeleterious: number;
    polyphenDamaging: number;
  };
  actionable: number;
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

// ---------------------------------------------------------------------------
// Specialist structured outputs
// ---------------------------------------------------------------------------

export interface EvidenceRef {
  source: string;         // e.g., "cohort_rows", "getRankedNeighbors", "getConnections"
  endpoint: string;       // API path called
  query: Record<string, unknown>;  // params used
}

export interface VariantTriageOutput {
  summary: string;
  topGenes?: Array<{ symbol: string; ensemblId?: string; variantCount?: number }>;
  topVariants?: Array<{ id: string; gene?: string; consequence?: string; significance?: string }>;
  cohortId?: string;
  derivedCohortId?: string;
  evidenceRefs: EvidenceRef[];
  stepsUsed: number;
  toolCallsMade: number;
  toolsUsed: string[];
}

export interface BioContextOutput {
  summary: string;
  entities?: Array<{ type: string; id: string; label: string }>;
  relationships?: Array<{ from: string; to: string; edgeType: string; score?: number }>;
  pathways?: Array<{ id: string; label: string; pValue?: number }>;
  evidenceRefs: EvidenceRef[];
  stepsUsed: number;
  toolCallsMade: number;
  toolsUsed: string[];
}

// ---------------------------------------------------------------------------
// PlanAgent types
// ---------------------------------------------------------------------------

export interface PlanStepResolve {
  do: "resolve";
  entities: string[];
}

export interface PlanStepDelegate {
  do: "delegate";
  agent: "variantTriage" | "bioContext";
  task: string;
  cohortId?: string;
  geneSymbol?: string;
}

export interface PlanStepSynthesize {
  do: "synthesize";
}

export type PlanStep = PlanStepResolve | PlanStepDelegate | PlanStepSynthesize;

export interface AgentPlan {
  queryType: QueryType;
  steps: PlanStep[];
}
