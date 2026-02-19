// ---------------------------------------------------------------------------
// Client-side orchestration inference
// ---------------------------------------------------------------------------
// Pure utility — takes tool UI parts and derives phase, progress, status text.
// Used by OrchestrationHeader to show live agent progress.

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
const SYNTHESIS_INDICATOR = new Set<string>(); // synthesis = no tools

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

/** Derive orchestration state from an array of tool UI parts */
export function inferOrchestration(
  toolParts: ToolUIPart[],
  isStreaming: boolean,
  hasTextContent: boolean,
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

  // Detect synthesis: has text content and no active/pending tools
  const hasActiveTools = toolParts.some(
    (p) => p.state === "input-available" || p.state === "input-streaming",
  );

  let phase: OrchestrationPhase;
  if (hasTextContent && !hasActiveTools && !isStreaming) {
    phase = "synthesize";
  } else if (hasTextContent && isStreaming && !hasActiveTools) {
    phase = "synthesize";
  } else {
    phase = inferPhase(toolNames);
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
