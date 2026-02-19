// ---------------------------------------------------------------------------
// Context budget management
// ---------------------------------------------------------------------------
// Rough token estimation and budget tracking for agent tool results.
// Prevents context overflow on complex multi-step explorations.

const CHARS_PER_TOKEN = 4;
const CONTEXT_BUDGET = 80_000; // ~80K tokens total budget

interface StepData {
  toolResults?: Array<{ output: unknown }>;
}

/** Rough token estimate for an arbitrary value (~4 chars/token for JSON) */
export function estimateTokens(value: unknown): number {
  if (value == null) return 0;
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return Math.ceil(json.length / CHARS_PER_TOKEN);
}

/** Sum estimated tokens across all tool results in steps */
export function sumToolResultTokens(steps: StepData[]): number {
  let total = 0;
  for (const step of steps) {
    for (const r of step.toolResults ?? []) {
      total += estimateTokens(r.output);
    }
  }
  return total;
}

/** 0–1 ratio of context utilization */
export function contextUtilization(steps: StepData[]): number {
  return Math.min(1, sumToolResultTokens(steps) / CONTEXT_BUDGET);
}

/** True when tool results exceed 75% of the context budget */
export function isContextHeavy(steps: StepData[]): boolean {
  return contextUtilization(steps) > 0.75;
}

/** True when tool results exceed 90% of the context budget */
export function isContextCritical(steps: StepData[]): boolean {
  return contextUtilization(steps) > 0.9;
}
