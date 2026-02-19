import type { PrepareStepFunction } from "ai";
import type { QueryType, ReportPlanOutput } from "../types";

// ---------------------------------------------------------------------------
// Tool names (must match keys in agent.ts)
// ---------------------------------------------------------------------------

const RESOLVE_TOOLS = ["searchEntities", "recallMemories", "reportPlan"] as const;

const MEMORY_TOOLS = ["recallMemories", "saveMemory"] as const;

const ALL_TOOLS = [
  "searchEntities",
  "getEntityContext",
  "compareEntities",
  "getRankedNeighbors",
  "runEnrichment",
  "findPaths",
  "getSharedNeighbors",
  "lookupVariant",
  "getGeneVariantStats",
  "getGwasAssociations",
  "createCohort",
  "analyzeCohort",
  "graphTraverse",
  "getGraphSchema",
  "variantBatchSummary",
  "recallMemories",
  "saveMemory",
  "reportPlan",
  "graphExplorer",
  "variantAnalyzer",
] as const;

// ---------------------------------------------------------------------------
// Query-type → focused tool sets
// ---------------------------------------------------------------------------

const TOOL_SETS: Record<QueryType, readonly string[]> = {
  entity_lookup: [
    "searchEntities", "getEntityContext", "getRankedNeighbors",
    "getGeneVariantStats", "getGwasAssociations", "runEnrichment",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  variant_analysis: [
    "searchEntities", "lookupVariant", "getGeneVariantStats",
    "getGwasAssociations", "createCohort", "analyzeCohort",
    "variantBatchSummary", "variantAnalyzer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  graph_exploration: [
    "searchEntities", "getEntityContext", "getRankedNeighbors",
    "findPaths", "getSharedNeighbors", "graphTraverse",
    "compareEntities", "runEnrichment", "graphExplorer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  cohort_analysis: [
    "searchEntities", "createCohort", "analyzeCohort",
    "variantBatchSummary", "getGeneVariantStats", "runEnrichment",
    "getEntityContext", "getRankedNeighbors", "variantAnalyzer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  comparison: [
    "searchEntities", "compareEntities", "getEntityContext",
    "getRankedNeighbors", "getSharedNeighbors", "findPaths",
    "runEnrichment",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  connection: [
    "searchEntities", "findPaths", "getSharedNeighbors",
    "getEntityContext", "getRankedNeighbors", "graphTraverse",
    "graphExplorer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  drug_discovery: [
    "searchEntities", "getEntityContext", "getRankedNeighbors",
    "findPaths", "getSharedNeighbors", "runEnrichment",
    "graphTraverse", "getGwasAssociations",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  general: [...ALL_TOOLS],
};

// ---------------------------------------------------------------------------
// Optional per-query-type system guidance
// ---------------------------------------------------------------------------

const QUERY_GUIDANCE: Partial<Record<QueryType, string>> = {
  graph_exploration:
    "\n\n[SYSTEM] Graph exploration mode. Focus on network traversal — use graphExplorer for complex multi-hop queries (3+ hops). Prefer findPaths and getSharedNeighbors for direct connectivity questions.",
  variant_analysis:
    "\n\n[SYSTEM] Variant analysis mode. Use lookupVariant for single variants, createCohort + analyzeCohort for batches. Use variantAnalyzer for complex multi-step variant/cohort workflows.",
  cohort_analysis:
    "\n\n[SYSTEM] Cohort analysis mode. Create the cohort first, then use analyzeCohort for aggregation/ranking/filtering. Bridge to the knowledge graph via top genes from byGene. Use variantAnalyzer for complex multi-step workflows.",
  connection:
    "\n\n[SYSTEM] Connection analysis mode. Use findPaths for direct shortest-path queries. Use graphExplorer for complex multi-hop exploration (3+ intermediaries).",
};

// ---------------------------------------------------------------------------
// Extract plan from completed steps
// ---------------------------------------------------------------------------

interface StepData {
  toolCalls?: Array<{ toolName: string }>;
  toolResults?: Array<{ toolName: string; output: unknown }>;
}

function extractPlan(steps: StepData[]): ReportPlanOutput | null {
  for (const step of steps) {
    if (!step.toolResults) continue;
    for (const result of step.toolResults) {
      if (result.toolName === "reportPlan" && result.output) {
        const r = result.output as Record<string, unknown>;
        if (r.queryType && Array.isArray(r.plan)) {
          return r as unknown as ReportPlanOutput;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

type Phase = "resolve" | "explore" | "synthesize";

function detectPhase(stepCount: number, hasToolCallInLastStep: boolean): Phase {
  if (stepCount <= 1) return "resolve";
  if (stepCount >= 13) return "synthesize";

  // If model naturally stopped calling tools mid-exploration, let it synthesize
  if (stepCount >= 3 && !hasToolCallInLastStep) return "synthesize";

  return "explore";
}

// ---------------------------------------------------------------------------
// prepareStep implementation
// ---------------------------------------------------------------------------

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] You have gathered enough data. Synthesize your findings into a clear, comprehensive answer. Do NOT call any more tools.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const favorPrepareStep: PrepareStepFunction<any> = ({
  stepNumber,
  steps,
}) => {
  // Check if the last step had any tool calls
  const lastStep = steps.at(-1);
  const hasToolCallInLastStep =
    lastStep?.toolCalls != null && lastStep.toolCalls.length > 0;

  const phase = detectPhase(stepNumber, hasToolCallInLastStep);

  switch (phase) {
    case "resolve":
      return { activeTools: [...RESOLVE_TOOLS] };

    case "explore": {
      // Try to read the plan from earlier steps
      const plan = extractPlan(steps as StepData[]);

      if (plan) {
        const queryType = plan.queryType;
        const tools = TOOL_SETS[queryType] ?? [...ALL_TOOLS];
        const guidance = QUERY_GUIDANCE[queryType];
        return {
          activeTools: [...tools],
          ...(guidance ? { system: guidance } : {}),
        };
      }

      // Fallback: no plan found, use all tools
      return { activeTools: [...ALL_TOOLS] };
    }

    case "synthesize":
      return {
        activeTools: [],
        system: SYNTHESIS_INSTRUCTION,
      };
  }
};
