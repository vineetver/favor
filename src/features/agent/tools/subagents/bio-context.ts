import { tool, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { nanoModel } from "../../lib/models";
import { buildBioContextPrompt } from "../../lib/prompts/bio-context-prompt";
import { createBioContextPrepareStep } from "../../lib/prepare-step-bio-context";
import type { BioContextOutput, EvidenceRef } from "../../types";
import { searchEntities } from "../search-entities";
import { getEntityContext } from "../entity-context";
import { getRankedNeighbors } from "../ranked-neighbors";
import { findPaths } from "../find-paths";
import { getSharedNeighbors } from "../shared-neighbors";
import { getConnections } from "../get-connections";
import { getEdgeDetail } from "../get-edge-detail";
import { graphTraverse } from "../graph-traverse";
import { compareEntities } from "../compare-entities";
import { runEnrichment } from "../enrichment";
import { getGraphSchema } from "../graph-schema";

// ---------------------------------------------------------------------------
// Specialist tools (isolated universe — no cohort tools)
// ---------------------------------------------------------------------------

const BIO_CONTEXT_TOOLS = {
  searchEntities,     // fallback only — supervisor pre-resolves
  getEntityContext,
  getRankedNeighbors,
  findPaths,
  getSharedNeighbors,
  getConnections,
  getEdgeDetail,
  graphTraverse,
  compareEntities,
  runEnrichment,
  getGraphSchema,
};

const SUBAGENT_TIMEOUT = 90_000; // 90s

// ---------------------------------------------------------------------------
// Structured output extraction
// ---------------------------------------------------------------------------

interface ToolResult {
  toolName: string;
  output: unknown;
  args?: Record<string, unknown>;
}

interface StepResult {
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
  toolResults: ToolResult[];
}

function extractStructuredOutput(
  text: string,
  agentSteps: StepResult[],
): BioContextOutput {
  const entities: BioContextOutput["entities"] = [];
  const relationships: BioContextOutput["relationships"] = [];
  const pathways: BioContextOutput["pathways"] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const toolsUsed = new Set<string>();
  let toolCallsMade = 0;
  const seenEntityIds = new Set<string>();

  for (const step of agentSteps) {
    for (const tc of step.toolCalls) {
      toolsUsed.add(tc.toolName);
      toolCallsMade++;
    }

    for (const r of step.toolResults) {
      const out = r.output as Record<string, unknown>;
      if (!out || out.error) continue;

      // Collect evidence refs
      evidenceRefs.push({
        source: r.toolName,
        endpoint: r.toolName,
        query: (r.args ?? {}) as Record<string, unknown>,
      });

      // Extract entities from getEntityContext
      if (r.toolName === "getEntityContext" && out.entity) {
        const e = out.entity as { type: string; id: string; label: string };
        if (!seenEntityIds.has(e.id)) {
          seenEntityIds.add(e.id);
          entities.push({ type: e.type, id: e.id, label: e.label });
        }
      }

      // Extract entities from getRankedNeighbors
      if (r.toolName === "getRankedNeighbors" && out.neighbors) {
        const neighbors = out.neighbors as Array<{
          entity: { type: string; id: string; label: string };
          score?: number;
        }>;
        for (const n of neighbors.slice(0, 10)) {
          if (!seenEntityIds.has(n.entity.id)) {
            seenEntityIds.add(n.entity.id);
            entities.push({ type: n.entity.type, id: n.entity.id, label: n.entity.label });
          }
        }
      }

      // Extract relationships from getConnections
      if (r.toolName === "getConnections" && out.edges) {
        const edges = out.edges as Array<{
          edgeType: string;
          from?: { id: string };
          to?: { id: string };
          score?: number;
        }>;
        for (const e of edges.slice(0, 10)) {
          relationships.push({
            from: e.from?.id ?? "unknown",
            to: e.to?.id ?? "unknown",
            edgeType: e.edgeType,
            score: e.score,
          });
        }
      }

      // Extract pathways from runEnrichment
      if (r.toolName === "runEnrichment" && Array.isArray(out)) {
        const enrichments = out as Array<{
          entity: { type: string; id: string; label: string };
          pValue: number;
        }>;
        for (const e of enrichments.slice(0, 10)) {
          pathways.push({
            id: e.entity.id,
            label: e.entity.label,
            pValue: e.pValue,
          });
        }
      }
      // Also handle enrichment results nested in result object
      if (r.toolName === "runEnrichment" && Array.isArray(r.output)) {
        const enrichments = r.output as Array<{
          entity: { type: string; id: string; label: string };
          pValue: number;
        }>;
        for (const e of enrichments.slice(0, 10)) {
          if (!pathways.some((p) => p.id === e.entity.id)) {
            pathways.push({
              id: e.entity.id,
              label: e.entity.label,
              pValue: e.pValue,
            });
          }
        }
      }
    }
  }

  return {
    summary: text,
    entities: entities.length > 0 ? entities : undefined,
    relationships: relationships.length > 0 ? relationships : undefined,
    pathways: pathways.length > 0 ? pathways : undefined,
    evidenceRefs,
    stepsUsed: agentSteps.length,
    toolCallsMade,
    toolsUsed: [...toolsUsed],
  };
}

// ---------------------------------------------------------------------------
// Specialist tool (exposed to supervisor)
// ---------------------------------------------------------------------------

export const bioContext = tool({
  description:
    "Delegate knowledge graph exploration to a specialist sub-agent. Handles: gene-disease associations, drug targets, pathway enrichment, entity comparison, path finding, shared neighbors, multi-hop traversal. Returns structured entities, relationships, and pathways discovered. Use for any graph exploration or biological context task.",
  inputSchema: z.object({
    task: z
      .string()
      .describe("Natural language description of the exploration task"),
    resolvedEntityIds: z
      .array(z.string())
      .optional()
      .describe("Pre-resolved entity IDs from searchEntities"),
    edgeTypeHints: z
      .array(z.string())
      .optional()
      .describe("Suggested edge types to explore (e.g., ['ASSOCIATED_WITH_DISEASE', 'TARGETS'])"),
  }),
  execute: async ({
    task,
    resolvedEntityIds,
    edgeTypeHints,
  }): Promise<BioContextOutput | { error: boolean; message: string }> => {
    const contextParts = [`Task: ${task}`];
    if (resolvedEntityIds?.length) {
      contextParts.push(`Pre-resolved entity IDs (use these, do NOT re-resolve): ${resolvedEntityIds.join(", ")}`);
    }
    if (edgeTypeHints?.length) {
      contextParts.push(`Suggested edge types: ${edgeTypeHints.join(", ")}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBAGENT_TIMEOUT);

    try {
      const agent = new ToolLoopAgent({
        model: nanoModel,
        instructions: buildBioContextPrompt(),
        tools: BIO_CONTEXT_TOOLS,
        stopWhen: stepCountIs(10),
        prepareStep: createBioContextPrepareStep(),
        maxOutputTokens: 4000,
      });

      const result = await agent.generate({
        prompt: contextParts.join("\n"),
        abortSignal: controller.signal,
      });

      return extractStructuredOutput(
        result.text,
        result.steps as unknown as StepResult[],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown subagent error";
      return { error: true, message: `Bio context failed: ${message}` };
    } finally {
      clearTimeout(timer);
    }
  },
  experimental_toToolResultContent: (output) => {
    if ("error" in output && (output as { error: boolean }).error) {
      return [{ type: "text", text: JSON.stringify(output) }];
    }
    const o = output as BioContextOutput;
    return [{ type: "text", text: o.summary }];
  },
});
