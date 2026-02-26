import { tool, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { nanoModel } from "../../lib/models";
import { buildBioContextPrompt } from "../../lib/prompts/bio-context-prompt";
import { createBioContextPrepareStep } from "../../lib/prepare-step-bio-context";
import type { BioContextOutput, EvidenceRef, SubagentToolTrace } from "../../types";
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

function summarizeToolInput(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "searchEntities": {
      const q = args.query as string | undefined;
      return q ? `"${q}"` : "search";
    }
    case "getEntityContext": {
      const type = args.type as string | undefined;
      const id = args.id as string | undefined;
      return type && id ? `${type}:${id}` : id ?? "entity";
    }
    case "getRankedNeighbors": {
      const type = args.type as string | undefined;
      const id = args.id as string | undefined;
      const edge = args.edgeType as string | undefined;
      return edge ? `${edge} from ${type ?? ""}:${id ?? ""}` : id ?? "neighbors";
    }
    case "findPaths": {
      const src = args.from as string | undefined;
      const tgt = args.to as string | undefined;
      return src && tgt ? `${src} → ${tgt}` : "paths";
    }
    case "getConnections": {
      const from = args.from as { type?: string; id?: string } | undefined;
      const to = args.to as { type?: string; id?: string } | undefined;
      return from?.id && to?.id ? `${from.id} ↔ ${to.id}` : "connections";
    }
    case "runEnrichment": {
      const genes = args.genes as unknown[] | undefined;
      return `${genes?.length ?? 0} genes`;
    }
    case "compareEntities": {
      const ents = args.entities as Array<{ id?: string }> | undefined;
      return ents?.map(e => e.id).join(" vs ") ?? "compare";
    }
    case "getSharedNeighbors": {
      const ents = args.entities as Array<{ id?: string }> | undefined;
      return ents?.map(e => e.id).join(", ") ?? "shared";
    }
    default:
      return Object.keys(args).slice(0, 2).join(", ") || "—";
  }
}

function summarizeToolOutput(name: string, out: Record<string, unknown>): string {
  if (out.error) return String(out.message ?? "error");
  switch (name) {
    case "searchEntities": {
      const results = Array.isArray(out) ? out : (out as Record<string, unknown>);
      return Array.isArray(results) ? `${results.length} results` : "results";
    }
    case "getEntityContext":
      return out.entity ? "loaded" : "context";
    case "getRankedNeighbors": {
      const n = out.neighbors as unknown[] | undefined;
      return n ? `${n.length} neighbors` : "neighbors";
    }
    case "findPaths": {
      const p = Array.isArray(out) ? out : (out.paths as unknown[] | undefined);
      return p ? `${p.length} paths` : "paths";
    }
    case "getConnections": {
      const e = out.edges as unknown[] | undefined;
      return e ? `${e.length} edges` : "connections";
    }
    case "runEnrichment": {
      // New format: { enriched: [...] } or old format: [...]
      const terms = Array.isArray(out) ? out : (out.enriched as unknown[] | undefined);
      return terms ? `${terms.length} terms` : "enrichment";
    }
    case "compareEntities":
      return "comparison";
    case "getSharedNeighbors": {
      const s = out.neighbors as unknown[] | undefined;
      const total = out.totalShared as number | undefined;
      return s ? `${total ?? s.length} shared` : "shared";
    }
    default:
      return "ok";
  }
}

/** Condense output for provenance display (cap array lengths to keep payload reasonable) */
function condenseOutput(out: unknown): unknown {
  if (!out || typeof out !== "object") return out;
  if (Array.isArray(out)) return out.slice(0, 25);
  const obj = out as Record<string, unknown>;
  const condensed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    condensed[key] = Array.isArray(val) ? val.slice(0, 25) : val;
  }
  return condensed;
}

function extractStructuredOutput(
  text: string,
  agentSteps: StepResult[],
): BioContextOutput {
  const entities: BioContextOutput["entities"] = [];
  const relationships: BioContextOutput["relationships"] = [];
  const pathways: BioContextOutput["pathways"] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const toolTrace: SubagentToolTrace[] = [];
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
      const hasError = !out || !!out.error;

      // Build tool trace entry with full provenance data
      const args = (r.args ?? {}) as Record<string, unknown>;
      toolTrace.push({
        toolName: r.toolName,
        inputSummary: summarizeToolInput(r.toolName, args),
        status: hasError ? "error" : "completed",
        outputSummary: hasError
          ? String((out as Record<string, unknown>)?.message ?? "error")
          : summarizeToolOutput(r.toolName, out),
        input: Object.keys(args).length > 0 ? args : undefined,
        output: condenseOutput(r.output),
      });

      if (hasError) continue;

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
        for (const n of neighbors.slice(0, 50)) {
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
      // The enrichment tool now returns { textSummary, enriched: [...] } or the old array format
      if (r.toolName === "runEnrichment") {
        let enrichments: Array<{
          entity: { type: string; id: string; label: string };
          pValue?: number;
          adjustedPValue?: number;
        }> = [];

        if (Array.isArray(out)) {
          // Legacy array format
          enrichments = out;
        } else if (out.enriched && Array.isArray(out.enriched)) {
          // New object format: { textSummary, enriched: [...] }
          enrichments = out.enriched as typeof enrichments;
        } else if (Array.isArray(r.output)) {
          enrichments = r.output;
        } else if (r.output && typeof r.output === "object" && "enriched" in (r.output as Record<string, unknown>)) {
          enrichments = (r.output as Record<string, unknown>).enriched as typeof enrichments;
        }

        for (const e of enrichments.slice(0, 20)) {
          if (!pathways.some((p) => p.id === e.entity.id)) {
            pathways.push({
              id: e.entity.id,
              label: e.entity.label,
              pValue: e.adjustedPValue ?? e.pValue ?? 0,
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
    toolTrace: toolTrace.length > 0 ? toolTrace : undefined,
    stepsUsed: agentSteps.length,
    toolCallsMade,
    toolsUsed: [...toolsUsed],
  };
}

// ---------------------------------------------------------------------------
// Specialist tool (exposed to supervisor)
// ---------------------------------------------------------------------------

// Types valid as graph exploration seeds. Excludes Study, Signal, Entity which
// are rarely useful and cause the sub-agent to make nonsensical tool calls.
const VALID_SEED_TYPES = new Set([
  "Gene", "Disease", "Drug", "Variant", "Pathway",
  "Phenotype", "GOTerm", "Tissue", "Metabolite",
  "ProteinDomain", "CellType", "SideEffect", "cCRE",
]);

/** Filter resolvedEntityIds to only valid seed types in Type:ID format. */
function filterResolvedIds(ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  return ids.filter((id) => {
    const colonIdx = id.indexOf(":");
    if (colonIdx < 0) return false;
    const type = id.slice(0, colonIdx);
    return VALID_SEED_TYPES.has(type);
  });
}

const bioContextInputSchema = z.object({
  task: z
    .string()
    .describe("Natural language description of the exploration task"),
  resolvedEntityIds: z
    .array(z.string())
    .optional()
    .describe("Pre-resolved entity IDs in Type:ID format (e.g., ['Drug:CHEMBL1431', 'Disease:MONDO_0005148']). Only pass the single best match per entity."),
});

type BioContextInput = z.infer<typeof bioContextInputSchema>;
type BioContextReturn = BioContextOutput | { error: boolean; message: string };

export const bioContext = tool<BioContextInput, BioContextReturn>({
  description:
    "Delegate knowledge graph exploration to a specialist sub-agent. Handles: gene-disease associations, drug targets, pathway enrichment, entity comparison, path finding, shared neighbors, multi-hop traversal. Returns structured entities, relationships, and pathways discovered. Use for any graph exploration or biological context task.",
  inputSchema: bioContextInputSchema,
  execute: async ({
    task,
    resolvedEntityIds,
  }): Promise<BioContextReturn> => {
    // Filter out non-seed types (Study, Signal, Entity) that cause bad tool calls
    const filteredIds = filterResolvedIds(resolvedEntityIds);

    const contextParts = [`Task: ${task}`];
    if (filteredIds.length) {
      contextParts.push(`Pre-resolved entity IDs (use these directly in tool calls, do NOT re-search): ${filteredIds.join(", ")}`);
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
  toModelOutput: ({ output }) => {
    if (output && "error" in output && (output as { error: boolean }).error) {
      return { type: "text" as const, value: JSON.stringify(output) };
    }
    const o = output as BioContextOutput;
    // If the sub-agent produced a summary, use it
    if (o.summary) {
      return { type: "text" as const, value: o.summary };
    }
    // Fallback: serialize structured data so supervisor can still synthesize
    const fallback: Record<string, unknown> = {};
    if (o.entities?.length) fallback.entities = o.entities;
    if (o.relationships?.length) fallback.relationships = o.relationships;
    if (o.pathways?.length) fallback.pathways = o.pathways;
    if (o.toolTrace?.length) {
      fallback.toolResults = o.toolTrace
        .filter((t) => t.status === "completed")
        .map((t) => ({ tool: t.toolName, input: t.inputSummary, output: t.outputSummary }));
    }
    return {
      type: "text" as const,
      value: Object.keys(fallback).length > 0
        ? JSON.stringify(fallback)
        : "No results found.",
    };
  },
});
