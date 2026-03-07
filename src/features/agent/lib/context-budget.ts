// ---------------------------------------------------------------------------
// Context budget management
// ---------------------------------------------------------------------------
// Full context estimation: system prompt + messages + tool results.
// Prevents context overflow on complex multi-step explorations.

const CHARS_PER_TOKEN = 4;
const CONTEXT_BUDGET = 80_000; // ~80K tokens total budget
const OUTPUT_RESERVE = 4_000; // Reserve for model output
const AVAILABLE_BUDGET = CONTEXT_BUDGET - OUTPUT_RESERVE;

interface StepData {
  toolCalls?: Array<{ toolName: string; input: unknown }>;
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
    // Also count tool call inputs (they stay in context too)
    for (const tc of step.toolCalls ?? []) {
      total += estimateTokens(tc.input);
    }
  }
  return total;
}

/** Estimate full context usage including system prompt and overhead */
export function estimateFullContext(
  steps: StepData[],
  systemPromptLength?: number,
): number {
  // Tool results + inputs
  const toolTokens = sumToolResultTokens(steps);

  // System prompt (~4 chars/token)
  const systemTokens = systemPromptLength
    ? Math.ceil(systemPromptLength / CHARS_PER_TOKEN)
    : 250; // ~1K chars default estimate

  // Per-step overhead: role markers, assistant reasoning text (~200 tokens/step)
  const overheadTokens = steps.length * 200;

  return toolTokens + systemTokens + overheadTokens;
}

/** 0–1 ratio of context utilization */
export function contextUtilization(
  steps: StepData[],
  systemPromptLength?: number,
): number {
  return Math.min(1, estimateFullContext(steps, systemPromptLength) / AVAILABLE_BUDGET);
}

/** True when context exceeds 75% of the budget */
export function isContextHeavy(
  steps: StepData[],
  systemPromptLength?: number,
): boolean {
  return contextUtilization(steps, systemPromptLength) > 0.75;
}

/** True when context exceeds 90% of the budget */
export function isContextCritical(
  steps: StepData[],
  systemPromptLength?: number,
): boolean {
  return contextUtilization(steps, systemPromptLength) > 0.9;
}
