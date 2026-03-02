/**
 * V2 Agent factory — 5 tools, observe-decide-act loop.
 * Replaces the 23-tool supervisor + specialist architecture.
 */

import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { buildSystemPromptV2 } from "./lib/prompts/system-v2";
import { createPrepareStepV2 } from "./lib/prepare-step-v2";
import { getSynthesisModel, getSynthesisProviderOptions } from "./lib/models";
import { createStateTool } from "./tools/state";
import { readTool } from "./tools/read";
import { createSearchTool } from "./tools/search";
import { createRunTool, type RunResult, type EntityRef } from "./tools/run";
import { askUserTool } from "./tools/ask-user";
import { fetchSessionState } from "./lib/session-state";
import type { VizSpec } from "./types";
import { generateVizSpecs } from "./viz";

// ---------------------------------------------------------------------------
// V2 tool assembly
// ---------------------------------------------------------------------------

export function createAgentToolsV2(sessionId: string) {
  // Mutable state for context
  let activeCohortId: string | null = null;
  const resolvedEntities: Record<string, EntityRef> = {};

  // Initialize from session state (fire-and-forget — will be loaded by State tool too)
  fetchSessionState(sessionId)
    .then(({ state }) => {
      activeCohortId = state.active_cohort_id;
      Object.assign(resolvedEntities, state.resolved_entities);
    })
    .catch(() => {});

  const tools = {
    State: createStateTool(sessionId),
    Read: readTool,
    Search: createSearchTool(sessionId, () => activeCohortId),
    Run: createRunTool(() => ({
      activeCohortId: activeCohortId ?? undefined,
      sessionId,
      resolvedEntities,
    })),
    AskUser: askUserTool,
  };

  // Hooks to update mutable state from Run results
  const onRunResult = (result: RunResult) => {
    if (result.state_delta.active_cohort_id) {
      activeCohortId = result.state_delta.active_cohort_id;
    }
    if (result.state_delta.pinned_entities) {
      for (const entity of result.state_delta.pinned_entities) {
        resolvedEntities[`${entity.type}:${entity.id}`] = entity;
        resolvedEntities[entity.label] = entity;
      }
    }
  };

  return { tools, onRunResult };
}

// ---------------------------------------------------------------------------
// V2 Agent factory
// ---------------------------------------------------------------------------

export function createFavorAgentV2(
  sessionId: string,
  synthesisModelId?: string,
) {
  const baseModel = getSynthesisModel(synthesisModelId);

  const model =
    process.env.NODE_ENV === "development"
      ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
      : baseModel;

  const { tools, onRunResult } = createAgentToolsV2(sessionId);

  // VizSpec collector
  const vizCollector: VizSpec[] = [];

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPromptV2(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(8),
    prepareStep: createPrepareStepV2(
      sessionId,
      getSynthesisProviderOptions(synthesisModelId),
    ),
    tools,
    onStepFinish({ toolCalls, toolResults, usage, finishReason }) {
      for (let i = 0; i < toolResults.length; i++) {
        const tc = toolCalls[i];
        const tr = toolResults[i];
        const output = tr.output as Record<string, unknown> | undefined;
        if (!output || output.error) continue;

        // Update mutable state from Run results
        if (tc.toolName === "Run" && output.state_delta) {
          onRunResult(output as unknown as RunResult);
        }

        // Generate VizSpecs from Run results
        if (tc.toolName === "Run") {
          const cmd = (tc.input as Record<string, unknown>)?.command as string;
          const vizResults = generateVizSpecs(
            `run_${cmd}`,
            tr.output,
            tc.input as Record<string, unknown>,
            vizCollector.length,
          );
          vizCollector.push(...vizResults);
        }
      }

      console.log(
        JSON.stringify({
          event: "agent_v2_step",
          tools: toolCalls.map((tc) => tc.toolName),
          errors: toolResults
            .filter((r) => (r.output as Record<string, unknown>)?.error)
            .map((r) => r.toolName),
          tokens: usage,
          finishReason,
        }),
      );
    },
  });
}

// Type export
const _typeAgent = createFavorAgentV2("__type_only__");
export type AgentV2UIMessage = InferAgentUIMessage<typeof _typeAgent>;
