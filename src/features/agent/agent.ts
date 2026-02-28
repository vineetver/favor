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
import { ResultStore } from "./lib/result-store";
import * as tools from "./tools";
import { createPlanQueryTool } from "./tools/plan-query";
import { createBioContextTool, createVariantTriageTool } from "./tools/subagents";
import { createGetResultSliceTool, createListResultsTool } from "./tools/result-tools";
import { createRunBatchTool, type BatchResultEntry } from "./tools/run-batch";
import { generateVizSpecs } from "./viz";
import type { ConversationContext, ResultType, VizSpec } from "./types";

// Map tool names to result types for auto-storage of direct tool calls
const AUTO_STORE_MAP: Record<string, ResultType> = {
  getRankedNeighbors: "neighbor_list",
  runEnrichment: "enrichment_list",
  findPaths: "traversal_graph",
  findPatterns: "pattern_matches",
  getSharedNeighbors: "entity_list",
  compareEntities: "comparison",
  getConnections: "connection_map",
  graphTraverse: "traversal_graph",
  analyzeCohort: "raw",
  getGwasAssociations: "gwas_list",
  getGeneVariantStats: "gene_stats",
  lookupVariant: "variant_list",
  variantBatchSummary: "raw",
  createCohort: "cohort",
};

function getAutoStoreSummary(toolName: string, output: Record<string, unknown>): string | null {
  if (output.error) return null;
  switch (toolName) {
    case "getRankedNeighbors": {
      const n = output.neighbors as unknown[] | undefined;
      return n ? `${n.length} neighbors` : null;
    }
    case "runEnrichment": {
      const e = output.enriched as unknown[] | undefined;
      return e ? `${e.length} enriched terms` : null;
    }
    case "findPaths": {
      const p = output.paths as unknown[] | undefined;
      const ts = output.textSummary as string | undefined;
      return ts ?? (p ? `${p.length} paths` : null);
    }
    case "findPatterns": {
      const m = output.matches as unknown[] | undefined;
      const ts = output.textSummary as string | undefined;
      return ts ?? (m ? `${m.length} pattern matches` : null);
    }
    case "getSharedNeighbors": {
      const s = output.neighbors as unknown[] | undefined;
      return s ? `${s.length} shared neighbors` : null;
    }
    case "compareEntities":
      return "entity comparison";
    case "getConnections": {
      const c = output.connections as unknown[] | undefined;
      return c ? `${c.length} connection types` : null;
    }
    case "graphTraverse":
      return "traversal result";
    case "analyzeCohort": {
      const rows = output.rows as unknown[] | undefined;
      const buckets = output.buckets as unknown[] | undefined;
      if (rows) return `${rows.length} rows`;
      if (buckets) return `${buckets.length} groups`;
      return null;
    }
    case "getGwasAssociations": {
      const a = output.topAssociations as unknown[] | undefined;
      return a ? `${a.length} GWAS associations` : null;
    }
    case "getGeneVariantStats":
      return output.totalVariants != null ? `${output.totalVariants} variants` : null;
    case "lookupVariant":
      return output.gene ? `variant in ${output.gene}` : "variant lookup";
    case "createCohort":
      return output.cohortId ? `cohort ${output.cohortId}` : null;
    default:
      return null;
  }
}

export function createFavorAgent(synthesisModelId?: string, context?: ConversationContext) {
  const baseModel = getSynthesisModel(synthesisModelId);

  const model =
    process.env.NODE_ENV === "development"
      ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() })
      : baseModel;

  // Create per-request ResultStore and hydrate from prior turns
  const resultStore = new ResultStore();
  if (context?.priorResults?.length) {
    resultStore.hydrate(context.priorResults);
  }

  // Build per-request tools
  const supervisorTools = {
    // Planning & memory
    planQuery: createPlanQueryTool(context),
    searchEntities: tools.searchEntities,
    recallMemories: tools.recallMemories,
    saveMemory: tools.saveMemory,
    // Result store
    getResultSlice: createGetResultSliceTool(resultStore),
    listResults: createListResultsTool(resultStore),
    // Graph micro-tools (direct access)
    getEntityContext: tools.getEntityContext,
    getRankedNeighbors: tools.getRankedNeighbors,
    findPaths: tools.findPaths,
    findPatterns: tools.findPatterns,
    getSharedNeighbors: tools.getSharedNeighbors,
    getConnections: tools.getConnections,
    getEdgeDetail: tools.getEdgeDetail,
    graphTraverse: tools.graphTraverse,
    compareEntities: tools.compareEntities,
    runEnrichment: tools.runEnrichment,
    getGraphSchema: tools.getGraphSchema,
    // Cohort micro-tools (direct access)
    getCohortSchema: tools.getCohortSchema,
    analyzeCohort: tools.analyzeCohort,
    createCohort: tools.createCohort,
    lookupVariant: tools.lookupVariant,
    getGeneVariantStats: tools.getGeneVariantStats,
    getGwasAssociations: tools.getGwasAssociations,
    variantBatchSummary: tools.variantBatchSummary,
    // Specialists (multi-step only)
    variantTriage: createVariantTriageTool(resultStore),
    bioContext: createBioContextTool(resultStore),
  };

  // runBatch needs the registry — add after object is built
  const allTools = {
    ...supervisorTools,
    runBatch: createRunBatchTool(supervisorTools, resultStore),
  };

  // Collect VizSpecs from direct tool calls
  const vizCollector: VizSpec[] = [];

  return new ToolLoopAgent({
    model,
    instructions: buildSupervisorPrompt(),
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(12),
    prepareStep: createSupervisorPrepareStep(
      nanoModel,
      NANO_PROVIDER_OPTIONS,
      getSynthesisProviderOptions(synthesisModelId),
      context,
    ),
    tools: allTools,
    onStepFinish({ toolCalls, toolResults, usage, finishReason }) {
      for (let i = 0; i < toolResults.length; i++) {
        const tc = toolCalls[i];
        const tr = toolResults[i];
        const output = tr.output as Record<string, unknown> | undefined;
        if (!output || output.error) continue;

        // Specialists handle their own storage and viz
        if (tc.toolName === "variantTriage" || tc.toolName === "bioContext") continue;

        // Batch results — generate VizSpec per sub-result (storage already done inside runBatch)
        if (tc.toolName === "runBatch") {
          const batch = output as { results?: BatchResultEntry[] };
          for (const entry of batch.results ?? []) {
            if (entry.error || !entry.output) continue;
            const vizResults = generateVizSpecs(entry.toolName, entry.output, entry.input ?? {}, vizCollector.length);
            vizCollector.push(...vizResults);
          }
          continue;
        }

        // Auto-store to ResultStore
        const resultType = AUTO_STORE_MAP[tc.toolName];
        if (resultType) {
          const summary = getAutoStoreSummary(tc.toolName, output);
          if (summary) {
            resultStore.put(resultType, tc.toolName, output, summary);
          }
        }

        // Generate VizSpec for direct tool calls
        const input = tc.input as Record<string, unknown> | undefined;
        const vizResults = generateVizSpecs(tc.toolName, tr.output, input ?? {}, vizCollector.length);
        vizCollector.push(...vizResults);
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
}

// Type export — use a default agent instance for type inference only
const _typeAgent = createFavorAgent();
export type AgentUIMessage = InferAgentUIMessage<typeof _typeAgent>;
