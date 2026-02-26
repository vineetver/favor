// ---------------------------------------------------------------------------
// Shared stuck-detection utilities
// ---------------------------------------------------------------------------
// Extracted from prepare-step.ts for reuse across supervisor and specialist
// prepareStep functions.

export interface StepData {
  toolCalls?: Array<{ toolName: string; args?: Record<string, unknown> }>;
  toolResults?: Array<{ toolName: string; output: unknown }>;
}

/** Last 2 steps all produced errors */
export function isAllErrors(steps: StepData[]): boolean {
  if (steps.length < 4) return false;
  const last2 = steps.slice(-2);
  return last2.every((s) => {
    if (!s.toolResults?.length) return true;
    return s.toolResults.every((r) => {
      const out = r.output as Record<string, unknown>;
      return out?.error === true;
    });
  });
}

/** Loop detection: last 3 steps have identical tool call signatures */
export function detectLoop(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const last3 = steps.slice(-3);

  const signatures = last3.map((s) => {
    if (!s.toolCalls?.length) return "";
    return s.toolCalls
      .map((tc) => `${tc.toolName}:${JSON.stringify(tc.args ?? {})}`)
      .sort()
      .join("|");
  });

  return signatures[0] !== "" && signatures[0] === signatures[1] && signatures[1] === signatures[2];
}

/** Diminishing returns: last 3 steps all return empty/error results */
export function isDiminishingReturns(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const last3 = steps.slice(-3);

  return last3.every((s) => {
    if (!s.toolResults?.length) return true;
    return s.toolResults.every((r) => {
      const out = r.output;
      if (out == null) return true;
      if (typeof out === "object") {
        const obj = out as Record<string, unknown>;
        if (obj.error === true) return true;
        if (Array.isArray(out)) return out.length === 0;
        const vals = Object.values(obj);
        if (vals.length === 0) return true;
        return vals.every(
          (v) => v == null || (Array.isArray(v) && v.length === 0),
        );
      }
      return false;
    });
  });
}

/** Tool name repetition: same tool called 3+ times across all steps */
export function detectToolRepetition(steps: StepData[]): boolean {
  const toolCounts = new Map<string, number>();
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      toolCounts.set(tc.toolName, (toolCounts.get(tc.toolName) ?? 0) + 1);
    }
  }
  // If any single tool was called 3+ times, the model is likely stuck
  for (const count of toolCounts.values()) {
    if (count >= 3) return true;
  }
  return false;
}

export type StuckReason = "all-errors" | "loop" | "diminishing-returns" | "tool-repetition" | null;

export function detectStuck(steps: StepData[]): StuckReason {
  if (isAllErrors(steps)) return "all-errors";
  if (detectLoop(steps)) return "loop";
  if (isDiminishingReturns(steps)) return "diminishing-returns";
  if (detectToolRepetition(steps)) return "tool-repetition";
  return null;
}

/** Get tools that have failed 3+ consecutive times */
export function getTrippedTools(steps: StepData[]): Set<string> {
  const consecutive = new Map<string, number>();
  for (const step of steps) {
    for (const r of step.toolResults ?? []) {
      const out = r.output as Record<string, unknown>;
      if (out?.error) {
        consecutive.set(r.toolName, (consecutive.get(r.toolName) ?? 0) + 1);
      } else {
        consecutive.set(r.toolName, 0);
      }
    }
  }
  return new Set(
    [...consecutive].filter(([, c]) => c >= 3).map(([n]) => n),
  );
}

/** Count total tool calls across all steps */
export function countToolCalls(steps: StepData[]): number {
  return steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0);
}
