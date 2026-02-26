import type { PrepareStepFunction } from "ai";
import type { AgentPlan, PlanStep } from "../types";
import type { nanoModel } from "./models";
import { isContextHeavy, isContextCritical } from "./context-budget";
import { detectStuck, countToolCalls, getTrippedTools, type StepData } from "./stuck-detection";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

// ---------------------------------------------------------------------------
// Supervisor tool names (must match keys in agent.ts)
// ---------------------------------------------------------------------------

const SUPERVISOR_TOOLS = [
  "planQuery",
  "searchEntities",
  "recallMemories",
  "saveMemory",
  "variantTriage",
  "bioContext",
] as const;

const TOOL_CALL_BUDGET = 30;

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output any explanatory text, plans, or commentary. ONLY call tools. Planning must go through the planQuery tool.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] You have gathered enough data. Now write a thorough, well-structured response that fully answers the user's question. Include all relevant findings from specialist outputs — gene associations, variant details, scores, clinical significance, and biological context. Use markdown headers, tables where appropriate, and explain what the data means. Do NOT call any more tools.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] A specialist failed or returned insufficient data. You may retry with a modified task description, delegate to a different specialist, or proceed to synthesis with what you have.";

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

function getCompletedPlanStepCount(plan: AgentPlan, steps: StepData[]): number {
  const calledTools = new Set<string>();
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calledTools.add(tc.toolName);
    }
  }

  let completed = 0;
  for (const planStep of plan.steps) {
    if (planStep.do === "resolve" && calledTools.has("searchEntities")) {
      completed++;
    } else if (planStep.do === "delegate") {
      if (calledTools.has(planStep.agent)) completed++;
    } else if (planStep.do === "synthesize") {
      // Synthesize is never "completed" until the model writes text
      break;
    }
  }
  return completed;
}

function getNextPlanStep(plan: AgentPlan, steps: StepData[]): PlanStep | null {
  const calledTools = new Set<string>();
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calledTools.add(tc.toolName);
    }
  }

  for (const planStep of plan.steps) {
    if (planStep.do === "resolve" && !calledTools.has("searchEntities")) {
      return planStep;
    }
    if (planStep.do === "delegate" && !calledTools.has(planStep.agent)) {
      return planStep;
    }
    if (planStep.do === "synthesize") {
      // Check if all prior steps are done
      const allDone = plan.steps.every((s) => {
        if (s.do === "resolve") return calledTools.has("searchEntities");
        if (s.do === "delegate") return calledTools.has(s.agent);
        return true; // synthesize itself
      });
      if (allDone) return planStep;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Hint generation from plan
// ---------------------------------------------------------------------------

function getPlanStepHint(plan: AgentPlan, nextStep: PlanStep | null): string {
  if (!nextStep) return "";

  if (nextStep.do === "resolve") {
    return `\n\n[SYSTEM] Execute plan step: RESOLVE. Call searchEntities for: ${nextStep.entities.join(", ")}. Collect resolved entity IDs.`;
  }
  if (nextStep.do === "delegate") {
    let hint = `\n\n[SYSTEM] Execute plan step: DELEGATE to ${nextStep.agent}. Task: "${nextStep.task}".`;
    if (nextStep.cohortId) hint += ` CohortId: ${nextStep.cohortId}.`;
    if (nextStep.geneSymbol) hint += ` Gene: ${nextStep.geneSymbol}.`;
    hint += " Pass any resolvedEntityIds from previous searchEntities calls.";
    return hint;
  }
  if (nextStep.do === "synthesize") {
    return ""; // Will be handled by synthesis mode
  }
  return "";
}

// ---------------------------------------------------------------------------
// prepareStep factory for the supervisor
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupervisorPrepareStep(
  nano: typeof nanoModel,
  nanoProviderOptions: ProviderOptions,
  synthesisProviderOptions?: ProviderOptions,
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
          activeTools: [...SUPERVISOR_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + RECOVERY_INSTRUCTION,
        };
      }
      return synthesize();
    }

    const tripped = getTrippedTools(stepsData);

    // --- Step 0: Force planQuery ---
    if (stepNumber === 0 || !hasPlanBeenEmitted(stepsData)) {
      // Force planQuery if not yet emitted
      if (!hasPlanBeenEmitted(stepsData) && stepNumber <= 1) {
        return {
          model: nano,
          providerOptions: nanoProviderOptions,
          toolChoice: { type: "tool", toolName: "planQuery" } as const,
          activeTools: ["planQuery"],
          system: NO_TEXT_INSTRUCTION,
        };
      }
    }

    // --- Plan-driven execution ---
    const plan = extractPlan(stepsData);
    if (plan) {
      const nextStep = getNextPlanStep(plan, stepsData);

      // All steps done → synthesize
      if (!nextStep || nextStep.do === "synthesize") {
        return synthesize();
      }

      const contextWarning = isContextHeavy(stepsData) ? CONTEXT_HEAVY_INSTRUCTION : "";
      const hint = getPlanStepHint(plan, nextStep);

      // Determine active tools based on plan step type
      let activeTools: string[];
      if (nextStep.do === "resolve") {
        activeTools = ["searchEntities", "recallMemories"];
      } else if (nextStep.do === "delegate") {
        activeTools = [nextStep.agent];
      } else {
        activeTools = [...SUPERVISOR_TOOLS];
      }

      return {
        model: nano,
        providerOptions: nanoProviderOptions,
        toolChoice: "required" as const,
        activeTools: activeTools.filter((t) => !tripped.has(t)),
        system: NO_TEXT_INSTRUCTION + hint + contextWarning,
      };
    }

    // --- Fallback: no plan (shouldn't happen, but defensive) ---
    return {
      model: nano,
      providerOptions: nanoProviderOptions,
      toolChoice: "required" as const,
      activeTools: [...SUPERVISOR_TOOLS].filter((t) => !tripped.has(t)),
      system: NO_TEXT_INSTRUCTION + "\n\n[SYSTEM] You have NOT emitted a plan yet. Call planQuery now.",
    };
  };
}
