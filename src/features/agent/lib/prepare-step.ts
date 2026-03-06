/**
 * prepareStep — simplified observe-decide-act loop.
 * state → tools → synthesis.
 */

import type { PrepareStepFunction } from "ai";
import { isContextHeavy, isContextCritical } from "./context-budget";
import { fetchSessionState, applyStateDelta, patchSessionState, type SessionState } from "./session-state";
import { buildSystemPrompt } from "./prompts/system";
import type { RunResult } from "../tools/run/types";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

// ---------------------------------------------------------------------------
// Stuck detection (simplified: 2 checks)
// ---------------------------------------------------------------------------

interface StepData {
  toolCalls?: Array<{ toolName: string; input: unknown }>;
  toolResults?: Array<{ toolName: string; output: unknown }>;
}

function isAllErrors(steps: StepData[]): boolean {
  if (steps.length < 2) return false;
  const last2 = steps.slice(-2);
  return last2.every((step) =>
    (step.toolResults ?? []).every((r) => {
      const out = r.output as Record<string, unknown> | undefined;
      return out?.error === true;
    }),
  );
}

function isLoop(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const last3 = steps.slice(-3);
  const sigs = last3.map((s) =>
    (s.toolCalls ?? []).map((tc) => `${tc.toolName}:${JSON.stringify(tc.input)}`).join(","),
  );
  return sigs[0] === sigs[1] && sigs[1] === sigs[2] && sigs[0].length > 0;
}

function detectStuck(steps: StepData[]): boolean {
  return isAllErrors(steps) || isLoop(steps);
}

function countToolCalls(steps: StepData[]): number {
  return steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] Synthesize now. No more tool calls." +
  "\nLead with findings. Tables for ranked data. Under 500 words. Only data from tool results." +
  "\n\nVerify before writing:" +
  "\n1. Every name/score traces to a tool result, not training data." +
  "\n2. Using relationship labels from results, not raw edge type identifiers." +
  "\n3. Numeric scores included, not just entity names." +
  "\n4. Entity subtitles for biological context." +
  "\n5. Empty steps stated explicitly." +
  "\n6. No raw JSON — prose and tables only.";

const CONTEXT_HEAVY_HINT =
  "\n\n[SYSTEM] Context is getting large. Be efficient — proceed to synthesis if you have enough data.";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOOL_CALL_BUDGET = 15;
const MAX_STEPS = 8;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrepareStep(
  sessionId: string,
  synthesisProviderOptions?: ProviderOptions,
): PrepareStepFunction<any> {
  let currentState: SessionState | null = null;
  let stateVersion = 0;

  const synthesize = (extraSystem?: string) => ({
    activeTools: [] as string[],
    system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
    ...(synthesisProviderOptions ? { providerOptions: synthesisProviderOptions } : {}),
  });

  return async ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    // --- 1. First step: load state, inject into system prompt ---
    if (stepNumber === 0) {
      try {
        const { state, version } = await fetchSessionState(sessionId);
        currentState = state;
        stateVersion = version;
      } catch {
        currentState = null;
      }

      return {
        toolChoice: "auto" as const,
        system: buildSystemPrompt(currentState ?? undefined),
      };
    }

    // --- 2. Context budget: critical → force synthesis ---
    if (isContextCritical(stepsData)) {
      return synthesize("\n\n[SYSTEM] Context budget exceeded — synthesize now.");
    }

    // --- 3. Tool call budget ---
    if (countToolCalls(stepsData) >= TOOL_CALL_BUDGET) {
      return synthesize();
    }

    // --- 4. Max steps ---
    if (stepNumber >= MAX_STEPS) {
      return synthesize();
    }

    // --- 5. Stuck detection ---
    if (detectStuck(stepsData)) {
      return synthesize();
    }

    // --- 6. After Run with state_delta: apply and persist ---
    const lastStep = stepsData.at(-1);
    if (lastStep?.toolResults) {
      for (const r of lastStep.toolResults) {
        const output = r.output as RunResult | Record<string, unknown> | undefined;
        if (output && "state_delta" in output && output.state_delta && currentState) {
          const delta = output.state_delta as RunResult["state_delta"];
          currentState = applyStateDelta(currentState, delta);
          // Persist asynchronously — update version on success
          patchSessionState(sessionId, currentState, stateVersion)
            .then((resp) => { stateVersion = resp.version; })
            .catch(() => { /* Non-critical — state will refresh next turn */ });
        }
      }
    }

    // --- 7. After Run with text_summary: force synthesis ---
    // When the last step returned a Run result with text_summary, the data
    // is ready for the user. Force synthesis to prevent the model from
    // just echoing tool results or offering follow-up buttons without
    // actually analyzing the data.  Multi-tool sequences still work via
    // parallel tool calls in a single step.
    if (lastStep?.toolResults) {
      const hasTerminalRun = lastStep.toolResults.some((r) => {
        const out = r.output as Record<string, unknown> | undefined;
        return r.toolName === "Run" && out?.text_summary && out?.status !== "error";
      });
      if (hasTerminalRun && stepNumber >= 2) {
        return synthesize();
      }
    }

    // --- 8. Context heavy hint ---
    const hint = isContextHeavy(stepsData) ? CONTEXT_HEAVY_HINT : "";

    // --- 9. Otherwise: let model decide ---
    return {
      toolChoice: "auto" as const,
      system: buildSystemPrompt(currentState ?? undefined) + hint,
    };
  };
}
