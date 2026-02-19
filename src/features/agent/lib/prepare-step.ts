import type { PrepareStepFunction } from "ai";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;
import type { QueryType, ReportPlanOutput } from "../types";
import type { nanoModel } from "./models";

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
  "getConnections",
  "getEdgeDetail",
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
    "getConnections", "getEdgeDetail",
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
    "getConnections", "getEdgeDetail",
    "findPaths", "getSharedNeighbors", "graphTraverse",
    "compareEntities", "runEnrichment", "graphExplorer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  cohort_analysis: [
    "searchEntities", "createCohort", "analyzeCohort",
    "variantBatchSummary", "getGeneVariantStats", "runEnrichment",
    "getEntityContext", "getRankedNeighbors", "getConnections",
    "getEdgeDetail", "variantAnalyzer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  comparison: [
    "searchEntities", "compareEntities", "getEntityContext",
    "getConnections", "getEdgeDetail",
    "getRankedNeighbors", "getSharedNeighbors", "findPaths",
    "runEnrichment", "getGeneVariantStats", "getGwasAssociations",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  connection: [
    "searchEntities", "getConnections", "getEdgeDetail",
    "findPaths", "getSharedNeighbors",
    "getEntityContext", "getRankedNeighbors", "graphTraverse",
    "graphExplorer",
    "getGraphSchema",
    ...MEMORY_TOOLS,
  ],
  drug_discovery: [
    "searchEntities", "getEntityContext", "getRankedNeighbors",
    "getConnections", "getEdgeDetail",
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
  entity_lookup:
    "\n\n[SYSTEM] Entity lookup mode. For gene entities, ALWAYS call getGeneVariantStats in parallel with getEntityContext — variant burden data is expected. For multiple genes, call getGeneVariantStats in parallel for each. Pick edge types carefully: use ASSOCIATED_WITH_DISEASE for disease associations, TARGETS for drug targets, PARTICIPATES_IN for pathways.",
  graph_exploration:
    "\n\n[SYSTEM] Graph exploration mode. EDGE-AWARE ROUTING: Before each call, identify the source→target entity types and pick the specific edge type that matches the user's intent. Use graphTraverse for multi-hop chains (Gene→Disease→Phenotype). Use graphExplorer for complex 3+ hop exploration. Use findPaths for indirect paths between two entities. Use getSharedNeighbors for overlap questions. NEVER use getRankedNeighbors for pairwise questions.",
  variant_analysis:
    "\n\n[SYSTEM] Variant analysis mode. lookupVariant for single variant only — NEVER loop. createCohort + analyzeCohort for 2+ variants. Use variantAnalyzer for complex multi-step variant/cohort workflows. After identifying a gene, bridge to the KG with getGeneVariantStats and getRankedNeighbors(TARGETS) for drug landscape.",
  cohort_analysis:
    "\n\n[SYSTEM] Cohort analysis mode. Create the cohort first, then analyzeCohort for aggregation/ranking/filtering. Bridge to the knowledge graph via top genes from byGene → runEnrichment(PARTICIPATES_IN, Pathway) or getEntityContext. Use variantAnalyzer for complex multi-step workflows.",
  connection:
    "\n\n[SYSTEM] Connection analysis mode. MANDATORY ROUTING: Use getConnections for ALL direct edges between two entities. Use findPaths for indirect paths through intermediaries. Run both in parallel for comprehensive results. Use getEdgeDetail to drill into specific edge evidence. Use graphExplorer for complex multi-hop exploration (3+ intermediaries). NEVER use getRankedNeighbors for pairwise connection queries — it ranks ALL neighbors of one seed, not the relationship between two specific entities.",
  drug_discovery:
    "\n\n[SYSTEM] Drug discovery mode. EDGE-AWARE: Gene→Drug edges: TARGETS (Drug→Gene, largest — server auto-corrects direction), HAS_PGX_INTERACTION (Gene→Drug), HAS_CLINICAL_DRUG_EVIDENCE. Drug→Disease: INDICATED_FOR. Use getRankedNeighbors for 'top drugs for gene X'. Use getConnections when asking about a specific gene–drug pair. Use findPaths for indirect drug–disease connections.",
  comparison:
    "\n\n[SYSTEM] Comparison mode. Use compareEntities for side-by-side analysis of 2-5 same-type entities — returns shared/unique neighbors and Jaccard similarity in ONE call. NEVER call getRankedNeighbors twice to compare entities manually. Use getSharedNeighbors for specific edge-type overlap (e.g., shared pathways via PARTICIPATES_IN).",
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
// Infrastructure: budget governor, stuck detector, circuit breaker
// ---------------------------------------------------------------------------

const TOOL_CALL_BUDGET = 30;

function countToolCalls(steps: StepData[]): number {
  return steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0);
}

function isStuck(steps: StepData[]): boolean {
  if (steps.length < 4) return false;
  const last2 = steps.slice(-2);
  return last2.every((s) => {
    if (!s.toolResults?.length) return true;
    return s.toolResults.every((r) => {
      const out = r.output as Record<string, unknown>;
      return out?.error === true;
    });
  });
}

function getTrippedTools(steps: StepData[]): Set<string> {
  const consecutive = new Map<string, number>();
  for (const step of steps) {
    for (const r of step.toolResults ?? []) {
      const out = r.output as Record<string, unknown>;
      if (out?.error) {
        consecutive.set(r.toolName, (consecutive.get(r.toolName) ?? 0) + 1);
      } else {
        consecutive.set(r.toolName, 0);
      }
    }
  }
  return new Set(
    [...consecutive].filter(([, c]) => c >= 3).map(([n]) => n),
  );
}

// ---------------------------------------------------------------------------
// prepareStep factory
// ---------------------------------------------------------------------------

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output any explanatory text, plans, or commentary. ONLY call tools. All planning must go through the reportPlan tool, not as text output.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] You have gathered enough data. Now write a thorough, well-structured response that fully answers the user's question. Include all relevant findings from your tool calls — gene associations, variant details, scores, clinical significance, and biological context. Use markdown headers, tables where appropriate, and explain what the data means. Do NOT call any more tools.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrepareStep(
  nano: typeof nanoModel,
  nanoProviderOptions: ProviderOptions,
  synthesisProviderOptions?: ProviderOptions,
): PrepareStepFunction<any> {
  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    // --- Infrastructure checks ---
    if (countToolCalls(stepsData) >= TOOL_CALL_BUDGET || isStuck(stepsData)) {
      return {
        activeTools: [],
        system: SYNTHESIS_INSTRUCTION,
        ...(synthesisProviderOptions ? { providerOptions: synthesisProviderOptions } : {}),
      };
    }

    const tripped = getTrippedTools(stepsData);

    // --- Phase detection ---
    const lastStep = stepsData.at(-1);
    const hasToolCallInLastStep =
      lastStep?.toolCalls != null && lastStep.toolCalls.length > 0;

    const phase = detectPhase(stepNumber, hasToolCallInLastStep);

    switch (phase) {
      case "resolve":
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...RESOLVE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION,
        };

      case "explore": {
        const plan = extractPlan(stepsData);

        if (plan) {
          const queryType = plan.queryType;
          const tools = TOOL_SETS[queryType] ?? [...ALL_TOOLS];
          const guidance = QUERY_GUIDANCE[queryType];
          return {
            model: nano,
            providerOptions: nanoProviderOptions,
            toolChoice: "required" as const,
            activeTools: [...tools].filter((t) => !tripped.has(t)),
            system: NO_TEXT_INSTRUCTION + (guidance ?? ""),
          };
        }

        // No plan yet — keep reportPlan available alongside all tools.
        // gpt-5-nano calls ~1 tool per step, so the resolve phase (2 steps)
        // often isn't enough for it to emit both searchEntities and reportPlan.
        const allPlusReport = new Set([...ALL_TOOLS, "reportPlan"]);
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...allPlusReport].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] You have NOT emitted a reportPlan yet. You MUST call reportPlan before continuing with exploration tools. Call it now.",
        };
      }

      case "synthesize":
        // No model override — uses agent default (flagship synthesis model)
        return {
          activeTools: [],
          system: SYNTHESIS_INSTRUCTION,
          ...(synthesisProviderOptions ? { providerOptions: synthesisProviderOptions } : {}),
        };
    }
  };
}

