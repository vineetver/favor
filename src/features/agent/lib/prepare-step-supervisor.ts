import type { PrepareStepFunction } from "ai";
import type { AgentPlan, ConversationContext, PlanStep } from "../types";
import type { nanoModel } from "./models";
import { isContextHeavy, isContextCritical } from "./context-budget";
import { detectStuck, countToolCalls, getTrippedTools, type StepData } from "./stuck-detection";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

// ---------------------------------------------------------------------------
// Supervisor tool names (must match keys in agent.ts)
// ---------------------------------------------------------------------------

const CORE_TOOLS = [
  "planQuery",
  "searchEntities",
  "recallMemories",
  "saveMemory",
] as const;

const RESULT_STORE_TOOLS = [
  "getResultSlice",
  "listResults",
] as const;

const GRAPH_TOOLS = [
  "getEntityContext",
  "getRankedNeighbors",
  "findPaths",
  "findPatterns",
  "getSharedNeighbors",
  "getConnections",
  "getEdgeDetail",
  "graphTraverse",
  "compareEntities",
  "runEnrichment",
  "getGraphSchema",
] as const;

const COHORT_TOOLS = [
  "getCohortSchema",
  "analyzeCohort",
  "createCohort",
  "lookupVariant",
  "getGeneVariantStats",
  "getGwasAssociations",
  "variantBatchSummary",
] as const;

const SPECIALIST_TOOLS = [
  "variantTriage",
  "bioContext",
] as const;

const ALL_TOOLS = [
  ...CORE_TOOLS,
  ...RESULT_STORE_TOOLS,
  ...GRAPH_TOOLS,
  ...COHORT_TOOLS,
  ...SPECIALIST_TOOLS,
  "runBatch",
] as const;

const RESOLVE_TOOLS = [
  "searchEntities",
  "recallMemories",
  "getGraphSchema",
  "getCohortSchema",
  ...RESULT_STORE_TOOLS,
] as const;

/** Execute-phase tools — everything except planQuery */
const EXECUTE_TOOLS = ALL_TOOLS.filter((t) => t !== "planQuery");

const TOOL_CALL_BUDGET = 30;

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output any explanatory text, plans, or commentary. ONLY call tools. Planning must go through the planQuery tool.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] You have gathered enough data. Now write a thorough, well-structured response that fully answers the user's question. Include all relevant findings from tool outputs — gene associations, variant details, scores, clinical significance, and biological context. Use markdown headers, tables where appropriate, and explain what the data means. Do NOT call any more tools. CRITICAL: Only report facts from tool results above. NEVER supplement with training knowledge.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] A specialist failed or returned insufficient data. You may retry with a modified task description, delegate to a different specialist, fall back to direct micro-tools, or proceed to synthesis with what you have.";

const CONTEXT_HEAVY_INSTRUCTION =
  "\n\n[SYSTEM] Context is getting large. Be efficient — proceed to synthesis if you have enough data.";

// ---------------------------------------------------------------------------
// Plan extraction
// ---------------------------------------------------------------------------

function extractPlan(steps: StepData[]): AgentPlan | null {
  let lastPlan: AgentPlan | null = null;
  for (const step of steps) {
    if (!step.toolResults) continue;
    for (const result of step.toolResults) {
      if (result.toolName === "planQuery" && result.output) {
        const r = result.output as Record<string, unknown>;
        if (r.queryType && Array.isArray(r.steps)) {
          lastPlan = r as unknown as AgentPlan;
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
// Plan step tracking
// ---------------------------------------------------------------------------

function getNextPlanStep(plan: AgentPlan, steps: StepData[]): PlanStep | null {
  const calledTools = new Set<string>();
  let hasDirectToolCalls = false;
  let hasBatchCall = false;

  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calledTools.add(tc.toolName);
      if (tc.toolName === "runBatch") hasBatchCall = true;
      if (!["planQuery", "searchEntities", "recallMemories", "saveMemory", "variantTriage", "bioContext", "getResultSlice", "listResults", "runBatch"].includes(tc.toolName)) {
        hasDirectToolCalls = true;
      }
    }
  }

  for (const planStep of plan.steps) {
    if (planStep.do === "resolve" && !calledTools.has("searchEntities")) return planStep;
    if (planStep.do === "delegate" && !calledTools.has(planStep.agent)) return planStep;
    if (planStep.do === "direct" && !hasDirectToolCalls) return planStep;
    if (planStep.do === "batch" && !hasBatchCall) return planStep;
    if (planStep.do === "synthesize") {
      const allDone = plan.steps.every((s) => {
        if (s.do === "resolve") return calledTools.has("searchEntities");
        if (s.do === "delegate") return calledTools.has(s.agent);
        if (s.do === "direct") return hasDirectToolCalls;
        if (s.do === "batch") return hasBatchCall;
        return true;
      });
      if (allDone) return planStep;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan step hints (guide, not contract)
// ---------------------------------------------------------------------------

function getPlanStepHint(nextStep: PlanStep | null): string {
  if (!nextStep) return "";

  if (nextStep.do === "resolve") {
    return `\n\n[SYSTEM] Plan suggests: RESOLVE. Call searchEntities once for EACH entity below using ONLY the bare name as query (no extra terms):\n${nextStep.entities.map(e => `- "${e}"`).join("\n")}\nCollect resolved entity IDs from results.`;
  }
  if (nextStep.do === "delegate") {
    let hint = `\n\n[SYSTEM] Plan suggests: DELEGATE to ${nextStep.agent}. Task: "${nextStep.task}".`;
    if (nextStep.cohortId) hint += ` CohortId: ${nextStep.cohortId}.`;
    if (nextStep.geneSymbol) hint += ` Gene: ${nextStep.geneSymbol}.`;
    hint += " Pass any resolvedEntityIds from previous searchEntities calls.";
    return hint;
  }
  if (nextStep.do === "direct") {
    return `\n\n[SYSTEM] Plan suggests: DIRECT. ${nextStep.description}. Use the appropriate micro-tools directly.`;
  }
  if (nextStep.do === "batch") {
    return `\n\n[SYSTEM] Plan suggests: BATCH. ${nextStep.description}. Use runBatch to execute multiple tool calls in parallel.`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Adaptive hints (Phase 6) — inspect last step results
// ---------------------------------------------------------------------------

function getAdaptiveHint(stepsData: StepData[]): string {
  const lastStep = stepsData.at(-1);
  if (!lastStep?.toolResults?.length) return "";

  const hints: string[] = [];

  for (const r of lastStep.toolResults) {
    const out = r.output as Record<string, unknown> | undefined;
    if (!out) continue;

    if (r.toolName === "getRankedNeighbors") {
      const neighbors = out.neighbors as Array<{ score?: number }> | undefined;
      if (neighbors && neighbors.length === 0) {
        hints.push("getRankedNeighbors returned 0 results. Check that you used the correct entity TYPE from searchEntities (e.g., Disease not Gene). Try a different edgeType, or use getConnections to see what edge types exist.");
      } else if (neighbors && neighbors.length >= 3) {
        // Detect degenerate scores — all 0, all identical, or all null
        const scores = neighbors.map((n) => n.score ?? 0);
        const unique = new Set(scores);
        if (unique.size === 1) {
          const resolved = out.resolved as Record<string, unknown> | undefined;
          const usedField = resolved?.scoreField as string | undefined;
          hints.push(
            `getRankedNeighbors scores are all ${scores[0]} (degenerate)${usedField ? ` using scoreField "${usedField}"` : ""}. ` +
            "Retry with a different scoreField. Pass an invalid name (e.g., '_') to get the server to list available fields for this edge type, then pick a meaningful one.",
          );
        }
      }
    }

    if (r.toolName === "searchEntities") {
      const results = out.results as unknown[] | undefined;
      if (!results || results.length === 0) {
        hints.push("searchEntities returned 0 results. Try a different spelling or a broader query.");
      }
    }

    if (r.toolName === "runEnrichment") {
      const enriched = out.enriched as unknown[] | undefined;
      if (enriched && enriched.length === 0) {
        hints.push("Enrichment returned 0 results. The gene list may be too small or not enriched in standard pathways.");
      }
    }

    if ((r.toolName === "variantTriage" || r.toolName === "bioContext") && out.error) {
      hints.push(`${r.toolName} failed. Use direct micro-tools instead of retrying the specialist.`);
    }

    // General API error — surface the error message so the model can fix the call
    const err = out.error as Record<string, unknown> | boolean | undefined;
    if (err && r.toolName !== "variantTriage" && r.toolName !== "bioContext") {
      const msg = typeof err === "object" ? (err.message as string | undefined) : undefined;
      if (msg) {
        hints.push(`${r.toolName} error: ${msg.slice(0, 200)}. Read the error carefully and fix the parameters — do NOT guess field names.`);
      }
    }
  }

  if (hints.length === 0) return "";
  return `\n\n[SYSTEM] Adaptive hints based on last results:\n${hints.map(h => `- ${h}`).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Goal-based synthesis detection (Phase 6)
// ---------------------------------------------------------------------------

function shouldSynthesizeEarly(stepsData: StepData[]): boolean {
  if (stepsData.length < 2) return false;
  if (!hasPlanBeenEmitted(stepsData)) return false;

  const lastStep = stepsData.at(-1);
  const toolCalls = lastStep?.toolCalls?.length ?? 0;
  const totalCalls = countToolCalls(stepsData);

  // If 3+ tool calls completed and the last step had zero tool calls,
  // the model chose to stop calling tools — time to synthesize
  if (totalCalls >= 3 && toolCalls === 0) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Follow-up detection
// ---------------------------------------------------------------------------

function isLikelyFollowUp(state?: ConversationContext): boolean {
  if (!state || state.turnCount === 0) return false;
  return (state.priorResults?.length ?? 0) > 0 || Object.keys(state.resolvedEntities).length > 0;
}

// ---------------------------------------------------------------------------
// prepareStep factory for the supervisor
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupervisorPrepareStep(
  nano: typeof nanoModel,
  nanoProviderOptions: ProviderOptions,
  synthesisProviderOptions?: ProviderOptions,
  state?: ConversationContext,
): PrepareStepFunction<any> {
  let recoveryAttempted = false;

  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

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

    // --- Stuck detection ---
    const stuckReason = detectStuck(stepsData);
    if (stuckReason) {
      if (stuckReason === "all-errors") return synthesize();

      if (!recoveryAttempted) {
        recoveryAttempted = true;
        const tripped = getTrippedTools(stepsData);
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + RECOVERY_INSTRUCTION,
        };
      }
      return synthesize();
    }

    // --- Goal-based early synthesis (Phase 6) ---
    if (shouldSynthesizeEarly(stepsData)) {
      return synthesize();
    }

    const tripped = getTrippedTools(stepsData);

    // --- Follow-up path (covers ALL steps) ---
    // Skip planQuery entirely on follow-ups to avoid stuck task lists
    if (isLikelyFollowUp(state)) {
      const lastStepCalls = stepsData.at(-1)?.toolCalls?.length ?? 0;
      const totalCalls = countToolCalls(stepsData);

      // Step 0: force tool use, direct tools preferred over specialists
      if (stepNumber === 0) {
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] This is a follow-up turn. Prior results are available in conversation context. Check listResults/getResultSlice for stored data. Prefer direct micro-tools (getEdgeDetail, getConnections, findPaths, etc.) over re-delegating to specialists. No planQuery needed.",
        };
      }

      // Step 1+: auto-synthesize when model stops calling tools
      if (lastStepCalls === 0 && totalCalls >= 1) {
        return synthesize();
      }

      // Otherwise continue with auto toolChoice + adaptive hints
      const contextWarning = isContextHeavy(stepsData) ? CONTEXT_HEAVY_INSTRUCTION : "";
      const adaptiveHint = getAdaptiveHint(stepsData);
      return {
        model: nano,
        providerOptions: nanoProviderOptions,
        toolChoice: "auto" as const,
        activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
        system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] Follow-up turn continuing. Use direct tools as needed, then synthesize." + adaptiveHint + contextWarning,
      };
    }

    // Force planQuery if not yet emitted (first turn only)
    if (!hasPlanBeenEmitted(stepsData) && stepNumber <= 1) {
      return {
        model: nano,
        providerOptions: nanoProviderOptions,
        toolChoice: { type: "tool", toolName: "planQuery" } as const,
        activeTools: ["planQuery"],
        system: NO_TEXT_INSTRUCTION,
      };
    }

    // --- Plan-guided execution (Phase 6: plan is a guide, not a contract) ---
    const plan = extractPlan(stepsData);
    if (plan) {
      const nextStep = getNextPlanStep(plan, stepsData);

      // Hard guard: synthesize-only plan on the FIRST turn is never valid.
      // The nano model misclassified the query — force execution tools instead.
      const isFirstTurn = !state || state.turnCount === 0;
      const onlyPlanQueryCalled = countToolCalls(stepsData) <= 1;
      if ((!nextStep || nextStep.do === "synthesize") && isFirstTurn && onlyPlanQueryCalled) {
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] The plan was synthesize-only but this is the first turn — no data has been gathered yet. You MUST call tools to fetch data before synthesizing. Use searchEntities, direct micro-tools, or specialists.",
        };
      }

      // All steps done → synthesize
      if (!nextStep || nextStep.do === "synthesize") {
        return synthesize();
      }

      const contextWarning = isContextHeavy(stepsData) ? CONTEXT_HEAVY_INSTRUCTION : "";
      const hint = getPlanStepHint(nextStep);
      const adaptiveHint = getAdaptiveHint(stepsData);

      // Phase 6: During EXECUTE, always expose all execute tools.
      // The plan hint guides the model, but it can deviate when results warrant it.
      // Resolve phase still uses restricted tools + required toolChoice.
      if (nextStep.do === "resolve") {
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: "required" as const,
          activeTools: [...RESOLVE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + hint + contextWarning,
        };
      }

      // All non-resolve execution steps: full tool access, auto toolChoice
      return {
        model: nano,
        providerOptions: nanoProviderOptions,
        toolChoice: "auto" as const,
        activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
        system: NO_TEXT_INSTRUCTION + hint + adaptiveHint + contextWarning,
      };
    }

    // --- Fallback: no plan (shouldn't happen, but defensive) ---
    return {
      model: nano,
      providerOptions: nanoProviderOptions,
      toolChoice: "required" as const,
      activeTools: [...EXECUTE_TOOLS].filter((t) => !tripped.has(t)),
      system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] You have NOT emitted a plan yet. Call planQuery now.",
    };
  };
}
