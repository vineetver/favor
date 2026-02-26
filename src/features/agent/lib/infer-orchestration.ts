// ---------------------------------------------------------------------------
// Client-side orchestration inference
// ---------------------------------------------------------------------------
// Pure utility — takes tool UI parts and derives phase, progress, status text.
// Used by OrchestrationHeader to show live agent progress.

import type { AgentPlan, PlanStep } from "../types";

export type OrchestrationPhase = "resolve" | "explore" | "synthesize";

export interface OrchestrationState {
  phase: OrchestrationPhase;
  phaseLabel: string;
  activeStatusText: string | null;
  completedToolCount: number;
  totalToolCount: number;
  hasExplicitPlan: boolean;
  inferredQueryType: string | null;
}

interface ToolUIPart {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
}

// Tool name → phase mapping (supervisor-level)
const RESOLVE_TOOL_NAMES = new Set(["searchEntities", "recallMemories", "planQuery"]);

const TOOL_PHASE_LABELS: Record<string, string> = {
  searchEntities: "Resolving",
  recallMemories: "Resolving",
  planQuery: "Planning",
  variantTriage: "Cohort Analysis",
  bioContext: "Knowledge Graph",
  saveMemory: "Resolving",
};

/** Get the phase label for a tool name (used for dividers) */
export function getToolPhaseLabel(toolName: string): string {
  const clean = toolName.replace(/^tool-/, "");
  return TOOL_PHASE_LABELS[clean] ?? "Processing";
}

// Query type inference from tool mix
const QUERY_TYPE_SIGNALS: Record<string, string[]> = {
  variant_analysis: ["variantTriage"],
  cohort_analysis: ["variantTriage"],
  graph_exploration: ["bioContext"],
  comparison: ["bioContext"],
  connection: ["bioContext"],
  drug_discovery: [],
};

function inferQueryType(toolNames: string[]): string | null {
  const nameSet = new Set(toolNames);
  for (const [qType, signals] of Object.entries(QUERY_TYPE_SIGNALS)) {
    if (signals.some((s) => nameSet.has(s))) return qType;
  }
  return null;
}

function inferPhase(toolNames: string[]): OrchestrationPhase {
  if (toolNames.length === 0) return "resolve";

  // If the last few tools are all resolve tools, we're still resolving
  const nonResolve = toolNames.filter((t) => !RESOLVE_TOOL_NAMES.has(t));
  if (nonResolve.length === 0) return "resolve";

  return "explore";
}

const PHASE_LABELS: Record<OrchestrationPhase, string> = {
  resolve: "Resolving",
  explore: "Exploring",
  synthesize: "Synthesizing",
};

// ---------------------------------------------------------------------------
// Tool-name matching (mirrors tool-renderers.tsx logic)
// ---------------------------------------------------------------------------

function normToolName(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]/g, "");
}

function toolNameMatches(planTool: string, actualTool: string): boolean {
  const a = normToolName(planTool);
  const b = normToolName(actualTool);
  return a === b || b.includes(a) || a.includes(b);
}

const DONE_STATES = new Set(["output-available", "output-error"]);
const RUNNING_STATES = new Set(["input-available", "input-streaming"]);

// ---------------------------------------------------------------------------
// Plan-aware phase detection
// ---------------------------------------------------------------------------

/** Map AgentPlan step to the tool(s) it corresponds to */
function planStepToTools(step: PlanStep): string[] {
  if (step.do === "resolve") return ["searchEntities"];
  if (step.do === "delegate") return [step.agent];
  if (step.do === "synthesize") return [];
  return [];
}

function inferPhaseFromPlan(
  steps: PlanStep[],
  toolParts: ToolUIPart[],
): OrchestrationPhase {
  const toolSteps = steps.filter((s) => s.do !== "synthesize");
  if (toolSteps.length === 0) return "synthesize";

  const stepDone = toolSteps.map((step) => {
    const tools = planStepToTools(step);
    if (tools.length === 0) return true;
    const matching = toolParts.filter((p) => {
      const name = (p.toolName ?? p.type ?? "").replace(/^tool-/, "");
      return tools.some((t) => toolNameMatches(t, name));
    });
    if (matching.length === 0) return false;
    return matching.every((p) => DONE_STATES.has(p.state ?? ""));
  });

  if (stepDone.every(Boolean)) return "synthesize";

  const firstIncomplete = stepDone.indexOf(false);
  if (firstIncomplete === 0) {
    const firstStep = toolSteps[0];
    if (firstStep.do === "resolve") return "resolve";
  }

  return "explore";
}

// ---------------------------------------------------------------------------
// Main inference function
// ---------------------------------------------------------------------------

/** Derive orchestration state from an array of tool UI parts */
export function inferOrchestration(
  toolParts: ToolUIPart[],
  isStreaming: boolean,
  hasTextContent: boolean,
  planOutput?: AgentPlan | null,
): OrchestrationState {
  const toolNames = toolParts.map(
    (p) => (p.toolName ?? p.type ?? "").replace(/^tool-/, ""),
  );

  const completedCount = toolParts.filter(
    (p) => p.state === "output-available" || p.state === "output-error",
  ).length;

  const hasExplicitPlan = toolNames.includes("planQuery") && toolParts.some(
    (p) => {
      const name = (p.toolName ?? p.type ?? "").replace(/^tool-/, "");
      return name === "planQuery" && p.state === "output-available";
    },
  );

  const hasActiveTools = toolParts.some((p) => RUNNING_STATES.has(p.state ?? ""));

  let phase: OrchestrationPhase;

  if (planOutput?.steps) {
    const planPhase = inferPhaseFromPlan(planOutput.steps, toolParts);

    // Only upgrade to synthesize once text is actually being produced
    if (planPhase === "synthesize" && hasTextContent && !hasActiveTools) {
      phase = "synthesize";
    } else if (planPhase === "synthesize" && !hasActiveTools && !isStreaming) {
      phase = "synthesize";
    } else if (planPhase === "synthesize") {
      phase = hasActiveTools ? "explore" : "synthesize";
    } else {
      phase = planPhase;
    }
  } else {
    // No plan: heuristic
    const nonResolveCompleted = toolParts.filter((p) => {
      const name = (p.toolName ?? p.type ?? "").replace(/^tool-/, "");
      return !RESOLVE_TOOL_NAMES.has(name) && DONE_STATES.has(p.state ?? "");
    });

    if (hasTextContent && !hasActiveTools && nonResolveCompleted.length > 0) {
      phase = "synthesize";
    } else {
      phase = inferPhase(toolNames);
    }
  }

  // Find last active tool for status text
  let activeStatusText: string | null = null;
  const activePart = [...toolParts].reverse().find(
    (p) => p.state === "input-available" || p.state === "input-streaming",
  );
  if (activePart) {
    const name = (activePart.toolName ?? activePart.type ?? "").replace(/^tool-/, "");
    activeStatusText = TOOL_PHASE_LABELS[name] ?? name;
  }

  // Estimate total tools
  const estimatedTotal = Math.max(toolNames.length + 2, 6);

  return {
    phase,
    phaseLabel: PHASE_LABELS[phase],
    activeStatusText,
    completedToolCount: completedCount,
    totalToolCount: estimatedTotal,
    hasExplicitPlan,
    inferredQueryType: hasExplicitPlan ? null : inferQueryType(toolNames),
  };
}
