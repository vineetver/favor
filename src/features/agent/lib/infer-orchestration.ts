// ---------------------------------------------------------------------------
// Client-side orchestration inference
// ---------------------------------------------------------------------------
// Pure utility — takes tool UI parts and derives phase, progress, status text.
// Used by OrchestrationHeader to show live agent progress.

import type { ReportPlanOutput } from "../types";

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

// Tool name → phase mapping
const RESOLVE_TOOL_NAMES = new Set(["searchEntities", "recallMemories", "reportPlan"]);

const TOOL_PHASE_LABELS: Record<string, string> = {
  searchEntities: "Resolving",
  recallMemories: "Resolving",
  reportPlan: "Planning",
  getEntityContext: "Data Collection",
  getRankedNeighbors: "Data Collection",
  getGeneVariantStats: "Data Collection",
  getGwasAssociations: "Data Collection",
  lookupVariant: "Data Collection",
  compareEntities: "Analysis",
  runEnrichment: "Analysis",
  findPaths: "Exploration",
  getSharedNeighbors: "Exploration",
  getConnections: "Exploration",
  getEdgeDetail: "Exploration",
  graphTraverse: "Exploration",
  graphExplorer: "Exploration",
  createCohort: "Cohort Analysis",
  analyzeCohort: "Cohort Analysis",
  variantBatchSummary: "Cohort Analysis",
  variantAnalyzer: "Variant Analysis",
  getGraphSchema: "Data Collection",
  saveMemory: "Resolving",
};

/** Get the phase label for a tool name (used for dividers) */
export function getToolPhaseLabel(toolName: string): string {
  const clean = toolName.replace(/^tool-/, "");
  return TOOL_PHASE_LABELS[clean] ?? "Processing";
}

// Query type inference from tool mix
const QUERY_TYPE_SIGNALS: Record<string, string[]> = {
  variant_analysis: ["lookupVariant", "variantAnalyzer", "variantBatchSummary"],
  cohort_analysis: ["createCohort", "analyzeCohort"],
  graph_exploration: ["graphTraverse", "graphExplorer", "findPaths", "getSharedNeighbors"],
  comparison: ["compareEntities"],
  connection: ["getConnections", "findPaths"],
  drug_discovery: [], // hard to infer without plan
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

/**
 * Derive the orchestration phase from the plan's tool assignments
 * and the actual tool part states. This replaces the heuristic-based
 * phase detection when a plan is available, keeping server-side
 * prepareStep and client-side UI in sync.
 */
function inferPhaseFromPlan(
  plan: ReportPlanOutput["plan"],
  toolParts: ToolUIPart[],
): OrchestrationPhase {
  const toolItems = plan.filter((item) => item.tools.length > 0);
  if (toolItems.length === 0) return "synthesize";

  const itemDone = toolItems.map((item) => {
    const matching = toolParts.filter((p) => {
      const name = (p.toolName ?? p.type ?? "").replace(/^tool-/, "");
      return item.tools.some((t) => toolNameMatches(t, name));
    });
    if (matching.length === 0) return false;
    return matching.every((p) => DONE_STATES.has(p.state ?? ""));
  });

  if (itemDone.every(Boolean)) return "synthesize";

  // Check if we're still in resolve (first plan step not started or only resolve tools running)
  const firstIncomplete = itemDone.indexOf(false);
  if (firstIncomplete === 0) {
    // First step isn't done — check if it's a resolve-only step
    const firstTools = toolItems[0].tools;
    const isResolveStep = firstTools.every((t) => RESOLVE_TOOL_NAMES.has(t));
    if (isResolveStep) return "resolve";
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
  planOutput?: ReportPlanOutput | null,
): OrchestrationState {
  const toolNames = toolParts.map(
    (p) => (p.toolName ?? p.type ?? "").replace(/^tool-/, ""),
  );

  const completedCount = toolParts.filter(
    (p) => p.state === "output-available" || p.state === "output-error",
  ).length;

  const hasExplicitPlan = toolNames.includes("reportPlan") &&
    toolParts.some(
      (p) =>
        (p.toolName ?? p.type ?? "").replace(/^tool-/, "") === "reportPlan" &&
        p.state === "output-available",
    );

  const hasActiveTools = toolParts.some((p) => RUNNING_STATES.has(p.state ?? ""));

  let phase: OrchestrationPhase;

  if (planOutput?.plan) {
    // Plan-aware: derive phase from plan completion status
    const planPhase = inferPhaseFromPlan(planOutput.plan, toolParts);
    // Only upgrade to synthesize once text is actually being produced
    if (planPhase === "synthesize" && hasTextContent && !hasActiveTools) {
      phase = "synthesize";
    } else if (planPhase === "synthesize" && !hasActiveTools && !isStreaming) {
      phase = "synthesize";
    } else if (planPhase === "synthesize") {
      // All tool steps done but still streaming tools — show explore until text arrives
      phase = hasActiveTools ? "explore" : "synthesize";
    } else {
      phase = planPhase;
    }
  } else {
    // No plan: heuristic with guard against premature synthesis.
    // Require at least one non-resolve completed tool before text can trigger synthesis.
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

  // Estimate total tools — resolve(~2) + explore(plan steps * ~2 calls each) + buffer
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
