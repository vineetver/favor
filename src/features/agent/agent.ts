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
import { createRunTool } from "./tools/run";
import { askUserTool } from "./tools/ask-user";
import type { RunContext } from "./tools/run";

import type { VizSpec } from "./types";
import { generateVizSpecs } from "./viz";

// ---------------------------------------------------------------------------
// Tool assembly
// ---------------------------------------------------------------------------

export function createAgentTools(sessionId: string) {
  // State is owned by prepareStep — tools get context via getRunContext
  let getContext: () => RunContext = () => ({ sessionId });

  const tools = {
    State: createStateTool(sessionId),
    Read: readTool,
    Search: createSearchTool(sessionId, () => getContext().activeCohortId ?? null),
    Run: createRunTool(() => getContext()),
    AskUser: askUserTool,
  };

  return {
    tools,
    setContextProvider: (fn: () => RunContext) => { getContext = fn; },
  };
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

  const { tools, setContextProvider } = createAgentTools(sessionId);
  const { prepareStep, getRunContext } = createPrepareStep(
    sessionId,
    getSynthesisProviderOptions(synthesisModelId),
  );
  setContextProvider(getRunContext);

  // VizSpec collector — exposed via getVizSpecs for persistence
  const vizCollector: VizSpec[] = [];

  const agent = new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(8),
    prepareStep,
    tools,
    onStepFinish({ toolCalls, toolResults, usage, finishReason }) {
      // Generate VizSpecs from Run results
      for (let i = 0; i < toolResults.length; i++) {
        const tc = toolCalls[i];
        const tr = toolResults[i];
        const output = tr.output as Record<string, unknown> | undefined;
        if (!output || output.error) continue;

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

// Type export — inferred from factory return type without instantiation
export type AgentUIMessage = InferAgentUIMessage<
  ReturnType<typeof createFavorAgent>["agent"]
>;
