import type { PrepareStepFunction } from "ai";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;
import type { QueryType, ReportPlanOutput } from "../types";
import type { nanoModel } from "./models";
import { isContextHeavy, isContextCritical } from "./context-budget";

// ---------------------------------------------------------------------------
// Tool names (must match keys in agent.ts)
// ---------------------------------------------------------------------------

const RESOLVE_TOOLS = ["searchEntities", "reportPlan"] as const;

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
    // Primary cohort tools — the agent MUST use these first
    "analyzeCohort", "createCohort", "variantAnalyzer",
    // KG bridging — only AFTER cohort analysis, for top genes discovered
    "runEnrichment",
    "getGraphSchema",
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
    "\n\n[SYSTEM] Variant analysis mode. lookupVariant for single variant only — NEVER loop. For 2+ variants or when a cohortId is provided, use createCohort + analyzeCohort (rows/groupby/derive/prioritize/compute/correlation). Cohorts can have 5,000+ variants — cohort tools are optimized for this scale. IMPORTANT: 'apc_*' score columns (apc_protein_function, apc_conservation, etc.) are Annotation Principal Component scores — NOT the APC gene. Use variantAnalyzer for complex multi-step variant/cohort workflows. After identifying a gene, bridge to the KG with getGeneVariantStats and getRankedNeighbors(TARGETS) for drug landscape.",
  cohort_analysis:
    "\n\n[SYSTEM] Cohort analysis mode — call analyzeCohort NOW with the cohort ID from the user message. Do NOT call searchEntities, recallMemories, getEntityContext, or getGraphSchema — cohorts are NOT graph entities. For ranking: analyzeCohort(operation='rows', sort='cadd_phred', desc=true). For grouping: analyzeCohort(operation='groupby', group_by='gene'). For filtering: analyzeCohort(operation='derive', filters=[...]). For multi-criteria ranking: analyzeCohort(operation='prioritize', criteria=[...]). For composite scores: analyzeCohort(operation='compute', weights=[...]). For correlation: analyzeCohort(operation='correlation', x='...', y='...'). 'apc_*' scores (apc_protein_function etc.) = Annotation Principal Component, NOT the APC gene. KG bridging (searchEntities, getGeneVariantStats, runEnrichment) is ONLY for AFTER you get cohort results and want to look up top genes.",
  connection:
    "\n\n[SYSTEM] Connection analysis mode. MANDATORY ROUTING: Use getConnections for ALL direct edges between two entities. Use findPaths for indirect paths through intermediaries. Run both in parallel for comprehensive results. Use getEdgeDetail to drill into specific edge evidence. Use graphExplorer for complex multi-hop exploration (3+ intermediaries). NEVER use getRankedNeighbors for pairwise connection queries — it ranks ALL neighbors of one seed, not the relationship between two specific entities.",
  drug_discovery:
    "\n\n[SYSTEM] Drug discovery mode. EDGE-AWARE: Gene→Drug edges: TARGETS (Drug→Gene, largest — server auto-corrects direction), HAS_PGX_INTERACTION (Gene→Drug), HAS_CLINICAL_DRUG_EVIDENCE. Drug→Disease: INDICATED_FOR. Use getRankedNeighbors for 'top drugs for gene X'. Use getConnections when asking about a specific gene–drug pair. Use findPaths for indirect drug–disease connections.",
  comparison:
    "\n\n[SYSTEM] Comparison mode. Use compareEntities for side-by-side analysis of 2-5 same-type entities — returns shared/unique neighbors and Jaccard similarity in ONE call. NEVER call getRankedNeighbors twice to compare entities manually. Use getSharedNeighbors for specific edge-type overlap (e.g., shared pathways via PARTICIPATES_IN). IMPORTANT: When comparing GENE entities, ALWAYS call getGeneVariantStats in parallel for EACH gene — variant burden data (ClinVar, consequence, frequency, pathogenicity scores) is expected for gene comparisons. Call all getGeneVariantStats in a single parallel batch.",
};

// ---------------------------------------------------------------------------
// Extract plan from completed steps (returns LAST plan found for re-planning)
// ---------------------------------------------------------------------------

interface StepData {
  toolCalls?: Array<{ toolName: string; args?: Record<string, unknown> }>;
  toolResults?: Array<{ toolName: string; output: unknown }>;
}

function extractPlan(steps: StepData[]): ReportPlanOutput | null {
  let lastPlan: ReportPlanOutput | null = null;
  for (const step of steps) {
    if (!step.toolResults) continue;
    for (const result of step.toolResults) {
      if (result.toolName === "reportPlan" && result.output) {
        const r = result.output as Record<string, unknown>;
        if (r.queryType && Array.isArray(r.plan)) {
          lastPlan = r as unknown as ReportPlanOutput;
        }
      }
    }
  }
  return lastPlan;
}

function hasPlanBeenEmitted(steps: StepData[]): boolean {
  return extractPlan(steps) !== null;
}

// ---------------------------------------------------------------------------
// Phase detection (3 resolve steps: 0, 1, 2)
// ---------------------------------------------------------------------------

type Phase = "resolve" | "explore" | "synthesize";

function detectPhase(stepCount: number, hasToolCallInLastStep: boolean): Phase {
  // Steps 0–2: resolve phase (extended from 2 to 3 steps)
  if (stepCount <= 2) return "resolve";
  if (stepCount >= 14) return "synthesize";

  // If model naturally stopped calling tools mid-exploration, let it synthesize.
  // Use step >= 6 to avoid cutting off agents that pause briefly between batches.
  if (stepCount >= 6 && !hasToolCallInLastStep) return "synthesize";

  return "explore";
}

// ---------------------------------------------------------------------------
// Infrastructure: budget governor, stuck detectors, circuit breaker
// ---------------------------------------------------------------------------

const TOOL_CALL_BUDGET = 30;

function countToolCalls(steps: StepData[]): number {
  return steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0);
}

/** Original: last 2 steps all errors */
function isAllErrors(steps: StepData[]): boolean {
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

/** Loop detection: last 3 steps have identical tool call signatures */
function detectLoop(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const last3 = steps.slice(-3);

  // Build signature for each step: sorted toolName+JSON(args)
  const signatures = last3.map((s) => {
    if (!s.toolCalls?.length) return "";
    return s.toolCalls
      .map((tc) => `${tc.toolName}:${JSON.stringify(tc.args ?? {})}`)
      .sort()
      .join("|");
  });

  // All 3 must be non-empty and identical
  return signatures[0] !== "" && signatures[0] === signatures[1] && signatures[1] === signatures[2];
}

/** Diminishing returns: last 3 steps all return empty/error results */
function isDiminishingReturns(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const last3 = steps.slice(-3);

  return last3.every((s) => {
    if (!s.toolResults?.length) return true;
    return s.toolResults.every((r) => {
      const out = r.output;
      if (out == null) return true;
      if (typeof out === "object") {
        const obj = out as Record<string, unknown>;
        if (obj.error === true) return true;
        // Check for empty arrays/objects
        if (Array.isArray(out)) return out.length === 0;
        const vals = Object.values(obj);
        if (vals.length === 0) return true;
        // Check if all array values in the object are empty
        return vals.every(
          (v) => v == null || (Array.isArray(v) && v.length === 0),
        );
      }
      return false;
    });
  });
}

type StuckReason = "all-errors" | "loop" | "diminishing-returns" | null;

function detectStuck(steps: StepData[]): StuckReason {
  if (isAllErrors(steps)) return "all-errors";
  if (detectLoop(steps)) return "loop";
  if (isDiminishingReturns(steps)) return "diminishing-returns";
  return null;
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
// Plan-step awareness: inject focused hints based on plan progress
// ---------------------------------------------------------------------------

function normToolName(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]/g, "");
}

/**
 * Analyse which plan steps have been satisfied by tool calls so far and
 * return a system hint pointing the model at the next focus area.
 */
function getPlanStepHint(plan: ReportPlanOutput, steps: StepData[]): string {
  // Collect all tool names that have produced results
  const calledTools = new Set<string>();
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calledTools.add(normToolName(tc.toolName));
    }
  }

  const toolItems = plan.plan.filter((item) => item.tools.length > 0);

  // Find the first plan step where not all tools have been called
  for (let i = 0; i < toolItems.length; i++) {
    const item = toolItems[i];
    const remaining = item.tools.filter(
      (t) => !calledTools.has(normToolName(t)),
    );
    if (remaining.length > 0) {
      return `\n\n[SYSTEM] Plan progress: ${i}/${toolItems.length} steps done. Current focus: "${item.label}". Prioritize: ${remaining.join(", ")}.`;
    }
  }

  // All plan steps satisfied — no extra hint needed (synthesis will be triggered)
  return "";
}

// ---------------------------------------------------------------------------
// prepareStep factory
// ---------------------------------------------------------------------------

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output any explanatory text, plans, or commentary. ONLY call tools. All planning must go through the reportPlan tool, not as text output.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] You have gathered enough data. Now write a thorough, well-structured response that fully answers the user's question. Include all relevant findings from your tool calls — gene associations, variant details, scores, clinical significance, and biological context. Use markdown headers, tables where appropriate, and explain what the data means. Do NOT call any more tools.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] Your recent tool calls are not producing useful results — you may be repeating the same calls or getting empty data. CHANGE YOUR APPROACH: try different tools, different entity types, different edge types, or different parameters. Do NOT repeat what you just tried.";

const CONTEXT_HEAVY_INSTRUCTION =
  "\n\n[SYSTEM] Context is getting large. Be efficient — only make essential tool calls. Prefer summarizing what you have over gathering more data. If you have enough to answer, stop calling tools.";

const REPLAN_INSTRUCTION =
  "\n\n[SYSTEM] Your current exploration approach is not yielding results. Reassess the query and emit a NEW reportPlan with a different queryType and strategy. Then continue with the new plan.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrepareStep(
  nano: typeof nanoModel,
  nanoProviderOptions: ProviderOptions,
  synthesisProviderOptions?: ProviderOptions,
): PrepareStepFunction<any> {
  // Closure state for recovery and re-planning (reset per agent run)
  let recoveryAttempted = false;
  let replanAttempted = false;

  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    // Helper to build synthesis return
    const synthesize = (extraSystem?: string) => ({
      activeTools: [] as string[],
      system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
      ...(synthesisProviderOptions ? { providerOptions: synthesisProviderOptions } : {}),
    });

    // --- Context budget: critical → force synthesis ---
    if (isContextCritical(stepsData)) {
      return synthesize("\n\n[SYSTEM] Context budget exceeded — synthesize now with available data.");
    }

    // --- Tool call budget ---
    if (countToolCalls(stepsData) >= TOOL_CALL_BUDGET) {
      return synthesize();
    }

    // --- Stuck detection with recovery ---
    const stuckReason = detectStuck(stepsData);
    if (stuckReason) {
      // All-errors: always force synthesis (no recovery possible)
      if (stuckReason === "all-errors") {
        return synthesize();
      }

      // Loop or diminishing returns: try recovery once, then synthesize
      if (!recoveryAttempted) {
        recoveryAttempted = true;
        // Allow one recovery step with guidance to change approach
        const plan = extractPlan(stepsData);
        const tools = plan
          ? (TOOL_SETS[plan.queryType] ?? [...ALL_TOOLS])
          : [...ALL_TOOLS];
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...tools].filter((t) => !getTrippedTools(stepsData).has(t)),
          system: NO_TEXT_INSTRUCTION + RECOVERY_INSTRUCTION,
        };
      }
      return synthesize();
    }

    const tripped = getTrippedTools(stepsData);

    // --- Phase detection ---
    const lastStep = stepsData.at(-1);
    const hasToolCallInLastStep =
      lastStep?.toolCalls != null && lastStep.toolCalls.length > 0;

    const phase = detectPhase(stepNumber, hasToolCallInLastStep);

    switch (phase) {
      case "resolve": {
        const planExists = hasPlanBeenEmitted(stepsData);

        // Step 2 (third resolve step): force reportPlan if not yet emitted
        if (stepNumber === 2 && !planExists) {
          return {
            model: nano,
            providerOptions: nanoProviderOptions,
            toolChoice: { type: "tool", toolName: "reportPlan" } as const,
            activeTools: ["reportPlan"],
            system: NO_TEXT_INSTRUCTION,
          };
        }

        // Plan already emitted in step 0 or 1 — skip remaining resolve, go to explore
        if (planExists && stepNumber >= 1) {
          const plan = extractPlan(stepsData)!;
          const tools = TOOL_SETS[plan.queryType] ?? [...ALL_TOOLS];
          const guidance = QUERY_GUIDANCE[plan.queryType];
          return {
            model: nano,
            providerOptions: nanoProviderOptions,
            toolChoice: "required" as const,
            activeTools: [...tools].filter((t) => !tripped.has(t)),
            system: NO_TEXT_INSTRUCTION + (guidance ?? ""),
          };
        }

        // Steps 0–1: normal resolve with all resolve tools
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...RESOLVE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION,
        };
      }

      case "explore": {
        const plan = extractPlan(stepsData);

        // --- Re-planning: after 3+ explore steps with diminishing returns ---
        const exploreStepCount = stepNumber - 3; // steps after resolve
        if (
          exploreStepCount >= 3 &&
          !replanAttempted &&
          isDiminishingReturns(stepsData)
        ) {
          replanAttempted = true;
          return {
            model: nano,
            providerOptions: nanoProviderOptions,
            toolChoice: { type: "tool", toolName: "reportPlan" } as const,
            activeTools: ["reportPlan"],
            system: NO_TEXT_INSTRUCTION + REPLAN_INSTRUCTION,
          };
        }

        // Context heavy: inject efficiency guidance
        const contextWarning = isContextHeavy(stepsData) ? CONTEXT_HEAVY_INSTRUCTION : "";

        if (plan) {
          const queryType = plan.queryType;
          const tools = TOOL_SETS[queryType] ?? [...ALL_TOOLS];
          const guidance = QUERY_GUIDANCE[queryType];
          const planHint = getPlanStepHint(plan, stepsData);
          return {
            model: nano,
            providerOptions: nanoProviderOptions,
            toolChoice: "required" as const,
            activeTools: [...tools].filter((t) => !tripped.has(t)),
            system: NO_TEXT_INSTRUCTION + (guidance ?? "") + planHint + contextWarning,
          };
        }

        // No plan yet (shouldn't happen with forced step 2, but defensive)
        const allPlusReport = new Set([...ALL_TOOLS, "reportPlan"]);
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...allPlusReport].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] You have NOT emitted a reportPlan yet. You MUST call reportPlan before continuing with exploration tools. Call it now." + contextWarning,
        };
      }

      case "synthesize":
        // No model override — uses agent default (flagship synthesis model)
        return synthesize();
    }
  };
}
