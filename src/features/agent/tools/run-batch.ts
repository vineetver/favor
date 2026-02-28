import { tool } from "ai";
import { z } from "zod";
import type { ResultStore } from "../lib/result-store";
import type { ResultType } from "../types";

// Tools that are batchable (graph + cohort micro-tools)
const BATCHABLE = new Set([
  "getEntityContext",
  "getRankedNeighbors",
  "findPaths",
  "getSharedNeighbors",
  "getConnections",
  "getEdgeDetail",
  "graphTraverse",
  "compareEntities",
  "runEnrichment",
  "getGraphSchema",
  "getCohortSchema",
  "analyzeCohort",
  "createCohort",
  "lookupVariant",
  "getGeneVariantStats",
  "getGwasAssociations",
  "variantBatchSummary",
]);

const MAX_BATCH = 10;
const CONCURRENCY = 5;
const TIMEOUT_MS = 60_000;

// Same map as agent.ts AUTO_STORE_MAP — duplicated to avoid circular dep
const STORE_MAP: Record<string, ResultType> = {
  getRankedNeighbors: "neighbor_list",
  runEnrichment: "enrichment_list",
  findPaths: "traversal_graph",
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

function summarize(toolName: string, out: Record<string, unknown>): string | null {
  if (out.error) return null;
  const arr = (key: string) => out[key] as unknown[] | undefined;
  switch (toolName) {
    case "getRankedNeighbors": return arr("neighbors") ? `${arr("neighbors")!.length} neighbors` : null;
    case "runEnrichment": return arr("enriched") ? `${arr("enriched")!.length} enriched terms` : null;
    case "findPaths": return arr("paths") ? `${arr("paths")!.length} paths` : null;
    case "getSharedNeighbors": return arr("neighbors") ? `${arr("neighbors")!.length} shared neighbors` : null;
    case "compareEntities": return "entity comparison";
    case "getConnections": return arr("connections") ? `${arr("connections")!.length} connection types` : null;
    case "graphTraverse": return "traversal result";
    case "analyzeCohort": return arr("rows") ? `${arr("rows")!.length} rows` : arr("buckets") ? `${arr("buckets")!.length} groups` : null;
    case "getGwasAssociations": return arr("topAssociations") ? `${arr("topAssociations")!.length} GWAS associations` : null;
    case "getGeneVariantStats": return out.totalVariants != null ? `${out.totalVariants} variants` : null;
    case "lookupVariant": return out.gene ? `variant in ${out.gene}` : "variant lookup";
    case "createCohort": return out.cohortId ? `cohort ${out.cohortId}` : null;
    default: return null;
  }
}

export interface BatchResultEntry {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  resultRef?: string;
  error?: string;
}

// Minimal semaphore — runs at most `n` async tasks concurrently
function semaphore(n: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((r) => queue.push(r));
    active++;
    try { return await fn(); }
    finally { active--; queue.shift()?.(); }
  };
}

/**
 * createRunBatchTool — executes multiple micro-tool calls in parallel.
 * Accepts the full tool registry from agent.ts and a ResultStore.
 */
export function createRunBatchTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: Record<string, any>,
  resultStore: ResultStore,
) {
  return tool({
    description:
      `Execute multiple independent tool calls in parallel. Returns all results in one step.
USE FOR: symmetric operations on multiple entities ("Compare BRCA1 vs BRCA2", "Get stats for 5 genes").
DO NOT USE FOR: sequential dependencies, specialist delegation, or single tool calls.
Max ${MAX_BATCH} calls per batch. Only micro-tools (graph + cohort) are allowed.`,
    inputSchema: z.object({
      calls: z.array(z.object({
        toolName: z.string().describe("Name of the micro-tool to call"),
        input: z.record(z.unknown()).describe("Tool-specific input object"),
      })).min(1).max(MAX_BATCH),
    }),
    execute: async ({ calls }): Promise<{ results: BatchResultEntry[] }> => {
      if (calls.length > MAX_BATCH) {
        return { results: [{ toolName: "runBatch", input: {}, output: null, error: `Batch size ${calls.length} exceeds max ${MAX_BATCH}` }] };
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
      const limit = semaphore(CONCURRENCY);

      try {
        const settled = await Promise.allSettled(
          calls.map((call) => limit(async () => {
            if (ac.signal.aborted) throw new Error("batch timeout");

            if (!BATCHABLE.has(call.toolName)) {
              return { toolName: call.toolName, input: call.input as Record<string, unknown>, output: null, error: `"${call.toolName}" is not batchable` } satisfies BatchResultEntry;
            }

            const t = registry[call.toolName];
            if (!t?.execute) {
              return { toolName: call.toolName, input: call.input as Record<string, unknown>, output: null, error: `Unknown tool "${call.toolName}"` } satisfies BatchResultEntry;
            }

            const output = await t.execute(call.input, { abortSignal: ac.signal });
            const out = output as Record<string, unknown>;

            // Auto-store
            let resultRef: string | undefined;
            const type = STORE_MAP[call.toolName];
            if (type && !out.error) {
              const summary = summarize(call.toolName, out);
              if (summary) {
                const ref = resultStore.put(type, call.toolName, out, summary);
                resultRef = ref.refId;
              }
            }

            return { toolName: call.toolName, input: call.input as Record<string, unknown>, output, resultRef } satisfies BatchResultEntry;
          })),
        );

        return {
          results: settled.map((s, i) =>
            s.status === "fulfilled"
              ? s.value
              : { toolName: calls[i].toolName, input: calls[i].input as Record<string, unknown>, output: null, error: String(s.reason) },
          ),
        };
      } finally {
        clearTimeout(timer);
      }
    },
  });
}
