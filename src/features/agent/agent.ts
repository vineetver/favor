import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { buildSupervisorPrompt } from "./lib/prompts/supervisor-prompt";
import { createSupervisorPrepareStep } from "./lib/prepare-step-supervisor";
import { nanoModel, NANO_PROVIDER_OPTIONS, getSynthesisModel, getSynthesisProviderOptions } from "./lib/models";
import * as tools from "./tools";
import { createPlanQueryTool } from "./tools/plan-query";
import type { ConversationContext } from "./types";

export function createFavorAgent(synthesisModelId?: string, context?: ConversationContext) {
  const baseModel = getSynthesisModel(synthesisModelId);

  const model =
    process.env.NODE_ENV === "development"
      ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
      : baseModel;

  // Build per-request tools so planQuery gets conversation context
  const supervisorTools = {
    planQuery: createPlanQueryTool(context),
    searchEntities: tools.searchEntities,
    recallMemories: tools.recallMemories,
    saveMemory: tools.saveMemory,
    variantTriage: tools.variantTriage,
    bioContext: tools.bioContext,
  };

  return new ToolLoopAgent({
    model,
    instructions: buildSupervisorPrompt(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(12),
    prepareStep: createSupervisorPrepareStep(
      nanoModel,
      NANO_PROVIDER_OPTIONS,
      getSynthesisProviderOptions(synthesisModelId),
    ),
    tools: supervisorTools,
    onStepFinish({ toolCalls, toolResults, usage, finishReason }) {
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
}

// Type export — use a default agent instance for type inference only
const _typeAgent = createFavorAgent();
export type AgentUIMessage = InferAgentUIMessage<typeof _typeAgent>;
