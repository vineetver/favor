/**
 * prepareStep — simplified observe-decide-act loop.
 * state → tools → synthesis.
 */

import type { PrepareStepFunction } from "ai";
import { isContextHeavy, isContextCritical } from "./context-budget";
import { fetchSessionState, applyStateDelta, patchSessionState, type SessionState } from "./session-state";
import { buildSystemPrompt } from "./prompts/system";
import { schemaStore } from "../tools/run/handlers/graph-schema-store";
import type { AgentViewSchema } from "../tools/run/handlers/graph-schema-store";
import type { RunResult, EntityRef } from "../tools/run/types";
import type { RunContext } from "../tools/run/index";

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

function stepSignature(step: StepData): string {
  return (step.toolCalls ?? [])
    .map((tc) => `${tc.toolName}:${JSON.stringify(tc.input)}`)
    .join(",");
}

function isLoop(steps: StepData[]): boolean {
  if (steps.length < 3) return false;
  const sigs = steps.slice(-4).map(stepSignature);

  // Triple repeat: A-A-A
  if (sigs.length >= 3) {
    const [a, b, c] = sigs.slice(-3);
    if (a === b && b === c && a.length > 0) return true;
  }

  // Alternating: A-B-A-B
  if (sigs.length >= 4) {
    const [w, x, y, z] = sigs.slice(-4);
    if (w === y && x === z && w !== x && w.length > 0) return true;
  }

  // Same tool, different params 3+ times (model keeps retrying with variations)
  if (steps.length >= 3) {
    const last3 = steps.slice(-3);
    const toolNames = last3.map((s) =>
      (s.toolCalls ?? []).map((tc) => tc.toolName).join(","),
    );
    const allSameTool = toolNames[0] === toolNames[1] && toolNames[1] === toolNames[2] && toolNames[0].length > 0;
    const allErrors = last3.every((s) =>
      (s.toolResults ?? []).every((r) => {
        const out = r.output as Record<string, unknown> | undefined;
        return out?.error === true;
      }),
    );
    if (allSameTool && allErrors) return true;
  }

  return false;
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
) {
  let currentState: SessionState | null = null;
  let stateVersion = 0;
  let systemPromptLength = 0;
  let stateDirty = false;
  let agentView: AgentViewSchema | null = null;

  // Mutable agent state — single source of truth
  const failureTracker = new Map<string, number>();
  const resolvedEntities: Record<string, EntityRef> = {};

  const getRunContext = (): RunContext => ({
    activeCohortId: currentState?.active_cohort_id ?? undefined,
    sessionId,
    resolvedEntities,
    failureTracker,
  });

  const synthesize = (extraSystem?: string) => ({
    activeTools: [] as string[],
    system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
    ...(synthesisProviderOptions ? { providerOptions: synthesisProviderOptions } : {}),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prepareStep: PrepareStepFunction<any> = async ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    // --- 1. First step: load state + agent view, inject into system prompt ---
    if (stepNumber === 0) {
      try {
        const { state, version } = await fetchSessionState(sessionId);
        currentState = state;
        stateVersion = version;
      } catch {
        currentState = null;
      }

      // Fetch compact graph schema for prompt injection (non-fatal)
      try { agentView = await schemaStore.getAgentView(); } catch { /* ignore */ }

      const sys = buildSystemPrompt(currentState ?? undefined, agentView);
      systemPromptLength = sys.length;
      return {
        toolChoice: "auto" as const,
        system: sys,
      };
    }

    // --- 2. Context budget: critical → force synthesis ---
    if (isContextCritical(stepsData, systemPromptLength)) {
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
    // If state was dirty from a prior failed patch, reload it first
    const lastStep = stepsData.at(-1);
    if (stateDirty && currentState) {
      try {
        const { state, version } = await fetchSessionState(sessionId);
        currentState = state;
        stateVersion = version;
        stateDirty = false;
      } catch {
        // Reload failed — continue with potentially stale state
      }
    }
    if (lastStep?.toolResults) {
      for (const r of lastStep.toolResults) {
        const output = r.output as RunResult | Record<string, unknown> | undefined;
        if (output && "state_delta" in output && output.state_delta) {
          const delta = output.state_delta as RunResult["state_delta"];

          // Update resolved entities cache
          if (delta.pinned_entities) {
            for (const entity of delta.pinned_entities) {
              resolvedEntities[`${entity.type}:${entity.id}`] = entity;
              resolvedEntities[entity.label] = entity;
            }
          }

          if (!currentState) continue;
          currentState = applyStateDelta(currentState, delta);
          // Persist with single retry on version conflict
          try {
            const resp = await patchSessionState(sessionId, currentState, stateVersion);
            stateVersion = resp.version;
            stateDirty = false;
          } catch (patchErr) {
            const err = patchErr as { status?: number };
            if (err.status === 409) {
              // Version conflict — reload and re-apply
              try {
                const { state: fresh, version: freshVer } = await fetchSessionState(sessionId);
                currentState = applyStateDelta(fresh, delta);
                const resp = await patchSessionState(sessionId, currentState, freshVer);
                stateVersion = resp.version;
                stateDirty = false;
              } catch {
                stateDirty = true;
              }
            } else {
              stateDirty = true;
            }
          }
        }
      }
    }

    // --- 7. After Run: synthesize only if the result is truly terminal ---
    // A Run is terminal when: it has a text_summary, no next_actions
    // suggesting follow-up, and the command is not setup/exploration.
    // Setup commands (set_cohort, pin, create_cohort, derive) and
    // exploration commands (explore, traverse) almost always have follow-ups.
    if (lastStep?.toolResults && stepNumber >= 2) {
      const CONTINUATION_COMMANDS = new Set([
        "set_cohort", "pin", "create_cohort", "derive",
        "explore", "traverse",
        "variant_profile", "pipeline",
      ]);

      const runResults = lastStep.toolResults.filter(
        (r) => r.toolName === "Run",
      );
      const hasTerminalRun =
        runResults.length > 0 &&
        runResults.every((r) => {
          const out = r.output as Record<string, unknown> | undefined;
          if (!out?.text_summary || out?.status === "error") return false;
          const cmd = (lastStep.toolCalls?.find(
            (tc) => tc.toolName === "Run",
          )?.input as Record<string, unknown>)?.command as string | undefined;
          // Continuation commands are never terminal
          if (cmd && CONTINUATION_COMMANDS.has(cmd)) return false;
          // If the result suggests follow-up work, don't synthesize
          const nextActions = out.next_actions as unknown[] | undefined;
          if (nextActions?.length) return false;
          return true;
        });
      if (hasTerminalRun) {
        return synthesize();
      }
    }

    // --- 8. Context heavy hint ---
    const hint = isContextHeavy(stepsData, systemPromptLength) ? CONTEXT_HEAVY_HINT : "";

    // --- 9. Otherwise: let model decide ---
    return {
      toolChoice: "auto" as const,
      system: buildSystemPrompt(currentState ?? undefined, agentView) + hint,
    };
  };

  return { prepareStep, getRunContext };
}
