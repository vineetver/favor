import type { PrepareStepFunction } from "ai";
import { nanoModel, NANO_PROVIDER_OPTIONS } from "./models";
import { detectStuck, countToolCalls, getTrippedTools, type StepData } from "./stuck-detection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BIO_CONTEXT_TOOLS = [
  "searchEntities",
  "getEntityContext",
  "getRankedNeighbors",
  "findPaths",
  "getSharedNeighbors",
  "getConnections",
  "getEdgeDetail",
  "graphTraverse",
  "compareEntities",
  "runEnrichment",
  "getGraphSchema",
] as const;

const TOOL_CALL_BUDGET = 20;
const MAX_STEPS = 10; // must match stepCountIs() in bio-context.ts
const SYNTHESIS_RESERVE = 2; // reserve last N steps for synthesis

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output explanatory text. ONLY call tools. When all exploration is done, write a summary of your findings.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] Write a summary of your exploration findings. Include key entities, relationships, and pathways discovered.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] Your recent tool calls are not producing useful results. CHANGE YOUR APPROACH: try different tools, different entity types, different edge types. If you got an edge type error, call getGraphSchema(nodeType) to discover valid edges.";

const SCORE_RETRY_INSTRUCTION =
  "\n\n[SYSTEM] The getRankedNeighbors results have degenerate scores (all identical or all zero). " +
  "Call getGraphSchema to see the scoreFields array for this edge type, " +
  "then retry getRankedNeighbors with the next scoreField that has good coverage.";

const SEARCH_ABUSE_INSTRUCTION =
  "\n\n[SYSTEM] STOP calling searchEntities repeatedly for individual gene/protein names. " +
  "This wastes your tool budget. Instead: use getRankedNeighbors on the SEED entity " +
  "(drug/disease) to discover genes via graph edges. searchEntities is only for " +
  "resolving the initial seed entity name to an ID.";

// ---------------------------------------------------------------------------
// Wasted searchEntities detection
// ---------------------------------------------------------------------------

function hasExcessiveSearches(steps: StepData[]): boolean {
  let searchCount = 0;
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      if (tc.toolName === "searchEntities") searchCount++;
    }
  }
  // 3+ searchEntities calls is almost always the agent searching for
  // individual genes by name instead of querying the graph
  return searchCount >= 3;
}

// ---------------------------------------------------------------------------
// Degenerate score detection
// ---------------------------------------------------------------------------

function hasDegenerateScores(steps: StepData[]): boolean {
  const recentSteps = steps.slice(-2);
  for (const step of recentSteps) {
    for (const r of step.toolResults ?? []) {
      if (r.toolName !== "getRankedNeighbors") continue;
      const out = r.output as Record<string, unknown>;
      if (out?.error) continue;
      const neighbors = out?.neighbors as Array<{ score?: number }> | undefined;
      if (!neighbors || neighbors.length < 3) continue;
      const scores = neighbors.map((n) => n.score).filter((s) => s != null) as number[];
      if (scores.length < 3) continue;
      const allSame = scores.every((s) => s === scores[0]);
      const allZero = scores.every((s) => s === 0);
      if (allSame || allZero) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// prepareStep factory for bioContext specialist
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBioContextPrepareStep(): PrepareStepFunction<any> {
  let recoveryAttempted = false;
  let scoreRetryAttempted = false;
  let searchAbuseWarned = false;

  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    const synthesize = (extraSystem?: string) => ({
      activeTools: [] as string[],
      system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
    });

    // Reserve last steps for synthesis — the agent MUST write a summary
    // before stepCountIs() kills the loop
    if (stepNumber >= MAX_STEPS - SYNTHESIS_RESERVE) {
      return synthesize();
    }

    // Tool call budget
    if (countToolCalls(stepsData) >= TOOL_CALL_BUDGET) {
      return synthesize();
    }

    // Stuck detection
    const stuckReason = detectStuck(stepsData);
    if (stuckReason) {
      if (stuckReason === "all-errors") return synthesize();
      if (!recoveryAttempted) {
        recoveryAttempted = true;
        const tripped = getTrippedTools(stepsData);
        return {
          model: nanoModel,
          providerOptions: NANO_PROVIDER_OPTIONS,
          toolChoice: "required" as const,
          activeTools: [...BIO_CONTEXT_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + RECOVERY_INSTRUCTION,
        };
      }
      return synthesize();
    }

    const tripped = getTrippedTools(stepsData);

    // Wasted searchEntities detection — stop the agent from burning tool budget
    if (!searchAbuseWarned && hasExcessiveSearches(stepsData)) {
      searchAbuseWarned = true;
      return {
        model: nanoModel,
        providerOptions: NANO_PROVIDER_OPTIONS,
        toolChoice: "required" as const,
        activeTools: [...BIO_CONTEXT_TOOLS].filter(
          (t) => t !== "searchEntities" && !tripped.has(t),
        ),
        system: NO_TEXT_INSTRUCTION + SEARCH_ABUSE_INSTRUCTION,
      };
    }

    // Degenerate score detection — nudge agent to retry with different scoreField
    if (!scoreRetryAttempted && hasDegenerateScores(stepsData)) {
      scoreRetryAttempted = true;
      return {
        model: nanoModel,
        providerOptions: NANO_PROVIDER_OPTIONS,
        toolChoice: "required" as const,
        activeTools: [...BIO_CONTEXT_TOOLS].filter((t) => !tripped.has(t)),
        system: NO_TEXT_INSTRUCTION + SCORE_RETRY_INSTRUCTION,
      };
    }

    // All steps: tool required, all tools available
    return {
      model: nanoModel,
      providerOptions: NANO_PROVIDER_OPTIONS,
      toolChoice: "required" as const,
      activeTools: [...BIO_CONTEXT_TOOLS].filter((t) => !tripped.has(t)),
      system: NO_TEXT_INSTRUCTION,
    };
  };
}
