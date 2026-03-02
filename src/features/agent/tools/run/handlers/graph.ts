/**
 * Graph command dispatch layer.
 * Shared exports (schema cache, error helpers, edge maps) + mode dispatch.
 */

import { agentFetch, AgentToolError } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import type { GraphSchemaResponse } from "../intent-aliases";
import {
  errorResult as makeErrorResult,
  catchToResult,
  TraceCollector,
  type RunResultEnvelope,
} from "../run-result";

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

/** Static edge map for enrichment — keyed by target node type.
 *  Used by explore-enrich (gene seeds) and as fallback for traverse-chain enrich.
 *  Traverse-chain prefers dynamic inference via findEdgesConnecting. */
export const TARGET_EDGE_MAP: Record<string, string> = {
  Pathway: "GENE_PARTICIPATES_IN_PATHWAY",
  Disease: "GENE_ASSOCIATED_WITH_DISEASE",
  GOTerm: "GENE_ANNOTATED_WITH_GO_TERM",
  Phenotype: "GENE_ASSOCIATED_WITH_PHENOTYPE",
  Drug: "DRUG_ACTS_ON_GENE",
  Tissue: "GENE_EXPRESSED_IN_TISSUE",
  SideEffect: "GENE_ASSOCIATED_WITH_SIDE_EFFECT",
  ProteinDomain: "GENE_HAS_PROTEIN_DOMAIN",
};

// ---------------------------------------------------------------------------
// Shared: error helpers (delegates to run-result.ts)
// ---------------------------------------------------------------------------

/** Simple error result with a message string */
export function errorResult(message: string, tc?: TraceCollector): RunResultEnvelope {
  return makeErrorResult({ message, tc });
}

/** Convert caught error to RunResult */
export function catchError(err: unknown, tc?: TraceCollector): RunResultEnvelope {
  return catchToResult(err, tc);
}

// ---------------------------------------------------------------------------
// Shared: edge type annotation helper
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 150;

function trimText(s: string, max = MAX_TEXT_LENGTH): string {
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

/**
 * Trim subtitle on an entity object in-place.
 * Handles both { subtitle } and nested { entity: { subtitle } } shapes.
 */
export function trimEntitySubtitles<T>(items: T[]): T[] {
  for (const item of items) {
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (typeof obj.subtitle === "string") {
        obj.subtitle = trimText(obj.subtitle);
      }
      // nested { entity: { subtitle } }
      if (obj.entity && typeof obj.entity === "object") {
        const ent = obj.entity as Record<string, unknown>;
        if (typeof ent.subtitle === "string") {
          ent.subtitle = trimText(ent.subtitle);
        }
      }
    }
  }
  return items;
}

/**
 * Look up edge type label + description from cached schema.
 * Returns a single annotation line: "EDGE_TYPE: <full description>"
 * or null if the edge type is not found.
 */
export async function edgeTypeAnnotation(edgeType: string): Promise<string | null> {
  const schema = await getCachedGraphSchema();
  const entry = schema.edgeTypes.find((e) => e.edgeType === edgeType);
  if (!entry?.description) return null;
  return `${edgeType}: ${entry.description}`;
}

/**
 * Build annotation lines for multiple edge types.
 * Returns empty string if no annotations found.
 */
export async function edgeTypeAnnotations(edgeTypes: string[]): Promise<string> {
  const schema = await getCachedGraphSchema();
  const lines: string[] = [];
  for (const et of edgeTypes) {
    const entry = schema.edgeTypes.find((e) => e.edgeType === et);
    if (entry?.description) {
      lines.push(`${et}: ${entry.description}`);
    }
  }
  return lines.length > 0 ? `\n\nEdge types:\n${lines.join("\n")}` : "";
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
