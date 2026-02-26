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

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output explanatory text. ONLY call tools. When all exploration is done, write a summary of your findings.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] Write a summary of your exploration findings. Include key entities, relationships, and pathways discovered.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] Your recent tool calls are not producing useful results. CHANGE YOUR APPROACH: try different tools, different entity types, different edge types. If you got an edge type error, call getGraphSchema(nodeType) to discover valid edges.";

// ---------------------------------------------------------------------------
// prepareStep factory for bioContext specialist
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBioContextPrepareStep(): PrepareStepFunction<any> {
  let recoveryAttempted = false;

  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    const synthesize = (extraSystem?: string) => ({
      activeTools: [] as string[],
      system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
    });

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
