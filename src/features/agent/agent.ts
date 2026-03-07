/**
 * Agent factory — 5 tools, observe-decide-act loop.
 */

import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { buildSystemPrompt } from "./lib/prompts/system";
import { createPrepareStep } from "./lib/prepare-step";
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
// Tool assembly
// ---------------------------------------------------------------------------

export function createAgentTools(sessionId: string) {
  // Mutable state for context
  let activeCohortId: string | null = null;
  const resolvedEntities: Record<string, EntityRef> = {};
  const failureTracker = new Map<string, never>();

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
      failureTracker,
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
// Agent factory
// ---------------------------------------------------------------------------

export function createFavorAgent(
  sessionId: string,
  synthesisModelId?: string,
) {
  const baseModel = getSynthesisModel(synthesisModelId);

  const model =
    process.env.NODE_ENV === "development"
      ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
      : baseModel;

  const { tools, onRunResult } = createAgentTools(sessionId);

  // VizSpec collector — exposed via getVizSpecs for persistence
  const vizCollector: VizSpec[] = [];

  const agent = new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(8),
    prepareStep: createPrepareStep(
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
          event: "agent_step",
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

  return { agent, getVizSpecs: () => vizCollector };
}

// Type export
const { agent: _typeAgent } = createFavorAgent("__type_only__");
export type AgentUIMessage = InferAgentUIMessage<typeof _typeAgent>;
