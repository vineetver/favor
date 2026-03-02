/**
 * Graph command dispatch layer.
 * Shared exports (schema cache, error helpers, edge maps) + mode dispatch.
 */

import { agentFetch, AgentToolError } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import type { GraphSchemaResponse } from "../intent-aliases";

// Mode handlers — explore
import { handleExploreNeighbors } from "./graph-explore-neighbors";
import { handleExploreCompare } from "./graph-explore-compare";
import { handleExploreEnrich } from "./graph-explore-enrich";
import { handleExploreSimilar } from "./graph-explore-similar";
import { handleExploreContext } from "./graph-explore-context";
import { handleExploreAggregate } from "./graph-explore-aggregate";
// Mode handlers — traverse
import { handleTraverseChain } from "./graph-traverse-chain";
import { handleTraversePaths } from "./graph-traverse-paths";
// Query handler
import { handleQuery } from "./graph-query";

// ---------------------------------------------------------------------------
// Shared: schema cache
// ---------------------------------------------------------------------------

const schemaCache = new Map<string, { schema: GraphSchemaResponse; ts: number }>();
const SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 min

export async function getCachedGraphSchema(portal?: string): Promise<GraphSchemaResponse> {
  const key = portal ?? "default";
  const cached = schemaCache.get(key);
  if (cached && Date.now() - cached.ts < SCHEMA_CACHE_TTL) return cached.schema;

  const resp = await agentFetch<{ data: GraphSchemaResponse }>("/graph/schema");
  const schema = resp.data;
  schemaCache.set(key, { schema, ts: Date.now() });
  return schema;
}

// ---------------------------------------------------------------------------
// Shared: enrichment edge type mapping
// ---------------------------------------------------------------------------

export const TARGET_EDGE_MAP: Record<string, string> = {
  Pathway: "GENE_PARTICIPATES_IN_PATHWAY",
  Disease: "GENE_ASSOCIATED_WITH_DISEASE",
  GOTerm: "GENE_ANNOTATED_WITH_GO_TERM",
  Phenotype: "GENE_ASSOCIATED_WITH_PHENOTYPE",
};

// ---------------------------------------------------------------------------
// Shared: error helpers
// ---------------------------------------------------------------------------

export function errorResult(message: string): RunResult {
  return {
    text_summary: message,
    data: { error: true, message },
    state_delta: {},
  };
}

export function catchError(err: unknown): RunResult {
  if (err instanceof AgentToolError) {
    return {
      text_summary: err.detail,
      data: err.toToolResult(),
      state_delta: {},
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    text_summary: `Internal error: ${message}`,
    data: { error: true, message },
    state_delta: {},
  };
}

// ---------------------------------------------------------------------------
// Explore dispatch
// ---------------------------------------------------------------------------

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;
type ExploreMode = ExploreCmd["mode"];

const EXPLORE_DISPATCH: Record<
  NonNullable<ExploreMode>,
  (cmd: ExploreCmd, cache?: Record<string, EntityRef>) => Promise<RunResult>
> = {
  neighbors: handleExploreNeighbors,
  compare: handleExploreCompare,
  enrich: handleExploreEnrich,
  similar: handleExploreSimilar,
  context: handleExploreContext,
  aggregate: handleExploreAggregate,
};

export async function handleExplore(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const mode = cmd.mode ?? "neighbors";
  const handler = EXPLORE_DISPATCH[mode];
  if (!handler) {
    return errorResult(`Unknown explore mode: ${mode}`);
  }
  return handler(cmd, resolvedCache);
}

// ---------------------------------------------------------------------------
// Traverse dispatch
// ---------------------------------------------------------------------------

type TraverseCmd = Extract<RunCommand, { command: "traverse" }>;
type TraverseMode = TraverseCmd["mode"];

const TRAVERSE_DISPATCH: Record<
  NonNullable<TraverseMode>,
  (cmd: TraverseCmd, cache?: Record<string, EntityRef>) => Promise<RunResult>
> = {
  chain: handleTraverseChain,
  paths: handleTraversePaths,
};

export async function handleTraverse(
  cmd: TraverseCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const mode = cmd.mode ?? "chain";
  const handler = TRAVERSE_DISPATCH[mode];
  if (!handler) {
    return errorResult(`Unknown traverse mode: ${mode}`);
  }
  return handler(cmd, resolvedCache);
}

// ---------------------------------------------------------------------------
// Query (single handler, no dispatch needed)
// ---------------------------------------------------------------------------

export { handleQuery };
