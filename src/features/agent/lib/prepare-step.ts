import type { PrepareStepFunction } from "ai";

// ---------------------------------------------------------------------------
// Tool names (must match keys in agent.ts)
// ---------------------------------------------------------------------------

const RESOLVE_TOOLS = ["searchEntities", "recallMemories"] as const;

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
  "variantBatchSummary",
  "recallMemories",
  "saveMemory",
] as const;

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

    case "explore":
      return { activeTools: [...ALL_TOOLS] };

    case "synthesize":
      return {
        activeTools: [],
        system: SYNTHESIS_INSTRUCTION,
      };
  }
};
