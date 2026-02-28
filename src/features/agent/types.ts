/**
 * Compressed output types shared across agent tools.
 * These are the shapes returned to the LLM after compression.
 */

import type { VizSpec } from "./viz/types";

export type { VizSpec } from "./viz/types";

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
  /** @deprecated No longer populated by the tool — kept for renderer compatibility */
  explanation?: string;
}

export interface RankedNeighborsResult {
  textSummary?: string;
  resolved: Record<string, unknown>;
  totalReturned: number;
  neighbors: CompressedNeighbor[];
}

export interface CompressedEnrichment {
  entity: { type: string; id: string; label: string };
  overlap: number;
  pValue: number;
  adjustedPValue: number;
  foldEnrichment: number;
  overlappingGenes: string[];
}

export interface EnrichmentResult {
  textSummary?: string;
  inputSize: number;
  backgroundSize: number;
  enriched: CompressedEnrichment[];
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
// Result store types (cross-turn persistence)
// ---------------------------------------------------------------------------

export type ResultType =
  | "entity_list"
  | "neighbor_list"
  | "enrichment_list"
  | "pathway_list"
  | "variant_list"
  | "gene_list"
  | "cohort"
  | "connection_map"
  | "traversal_graph"
  | "comparison"
  | "gwas_list"
  | "gene_stats"
  | "raw";

export interface ResultRef {
  refId: string;
  type: ResultType;
  toolName: string;
  summary: string;
  itemCount: number;
}

export interface StoredResult {
  ref: ResultRef;
  data: unknown;
  createdAt: number;
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

// ---------------------------------------------------------------------------
// Specialist structured outputs
// ---------------------------------------------------------------------------

export interface EvidenceRef {
  source: string;         // e.g., "cohort_rows", "getRankedNeighbors", "getConnections"
  endpoint: string;       // API path called
  query: Record<string, unknown>;  // params used
}

export interface SubagentToolTrace {
  toolName: string;
  inputSummary: string;
  status: "completed" | "error";
  outputSummary?: string;
  /** Full tool arguments for provenance display */
  input?: Record<string, unknown>;
  /** Condensed tool output (arrays capped at 10 items) */
  output?: unknown;
}

export interface VariantTriageOutput {
  summary: string;
  topGenes?: Array<{ symbol: string; ensemblId?: string; variantCount?: number }>;
  topVariants?: Array<{ id: string; gene?: string; consequence?: string; significance?: string }>;
  cohortId?: string;
  derivedCohortId?: string;
  evidenceRefs: EvidenceRef[];
  toolTrace?: SubagentToolTrace[];
  vizSpecs?: VizSpec[];
  resultRefs?: ResultRef[];
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
  toolTrace?: SubagentToolTrace[];
  vizSpecs?: VizSpec[];
  resultRefs?: ResultRef[];
  stepsUsed: number;
  toolCallsMade: number;
  toolsUsed: string[];
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
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
  cohortId?: string | null;
  geneSymbol?: string | null;
}

export interface PlanStepDirect {
  do: "direct";
  description: string;
}

export interface PlanStepBatch {
  do: "batch";
  description: string;
}

export interface PlanStepSynthesize {
  do: "synthesize";
}

export type PlanStep = PlanStepResolve | PlanStepDelegate | PlanStepDirect | PlanStepBatch | PlanStepSynthesize;

export interface AgentPlan {
  queryType: QueryType;
  steps: PlanStep[];
}

// ---------------------------------------------------------------------------
// Conversation context for follow-up awareness
// ---------------------------------------------------------------------------

export interface ConversationContext {
  /** label → { type, id } from prior searchEntities calls */
  resolvedEntities: Record<string, { type: string; id: string }>;
  /** Number of prior user turns */
  turnCount: number;
  /** Stored results from prior specialist/tool outputs for cross-turn persistence */
  priorResults?: Array<{ ref: ResultRef; data: unknown }>;
}
