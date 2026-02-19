import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { buildSystemPrompt } from "./lib/system-prompt";
import { favorPrepareStep } from "./lib/prepare-step";
import * as tools from "./tools";

const baseModel = openai("gpt-4o");

const model =
  process.env.NODE_ENV === "development"
    ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
    : baseModel;

export const favorAgent = new ToolLoopAgent({
  model,
  instructions: buildSystemPrompt(),
  maxOutputTokens: 8000,
  stopWhen: stepCountIs(15),
  prepareStep: favorPrepareStep,
  tools: {
    searchEntities: tools.searchEntities,
    getEntityContext: tools.getEntityContext,
    compareEntities: tools.compareEntities,
    getRankedNeighbors: tools.getRankedNeighbors,
    runEnrichment: tools.runEnrichment,
    findPaths: tools.findPaths,
    getSharedNeighbors: tools.getSharedNeighbors,
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
  },
});

export type AgentUIMessage = InferAgentUIMessage<typeof favorAgent>;
