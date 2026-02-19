import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { buildSystemPrompt } from "./lib/system-prompt";
import { createPrepareStep } from "./lib/prepare-step";
import { nanoModel, NANO_PROVIDER_OPTIONS, getSynthesisModel, getSynthesisProviderOptions } from "./lib/models";
import * as tools from "./tools";

const agentTools = {
  searchEntities: tools.searchEntities,
  getEntityContext: tools.getEntityContext,
  compareEntities: tools.compareEntities,
  getRankedNeighbors: tools.getRankedNeighbors,
  runEnrichment: tools.runEnrichment,
  findPaths: tools.findPaths,
  getSharedNeighbors: tools.getSharedNeighbors,
  getConnections: tools.getConnections,
  getEdgeDetail: tools.getEdgeDetail,
  lookupVariant: tools.lookupVariant,
  getGeneVariantStats: tools.getGeneVariantStats,
  getGwasAssociations: tools.getGwasAssociations,
  createCohort: tools.createCohort,
  analyzeCohort: tools.analyzeCohort,
  graphTraverse: tools.graphTraverse,
  getGraphSchema: tools.getGraphSchema,
  variantBatchSummary: tools.variantBatchSummary,
  recallMemories: tools.recallMemories,
  saveMemory: tools.saveMemory,
  reportPlan: tools.reportPlan,
  graphExplorer: tools.graphExplorer,
  variantAnalyzer: tools.variantAnalyzer,
};

export function createFavorAgent(synthesisModelId?: string) {
  const baseModel = getSynthesisModel(synthesisModelId);

  const model =
    process.env.NODE_ENV === "development"
      ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
      : baseModel;

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(15),
    prepareStep: createPrepareStep(
      nanoModel,
      NANO_PROVIDER_OPTIONS,
      getSynthesisProviderOptions(synthesisModelId),
    ),
    tools: agentTools,
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
