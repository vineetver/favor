/**
 * query command — structural pattern matching via /graph/patterns.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { inferEdgeType } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { getCachedGraphSchema, errorResult, catchError } from "./graph";

type QueryCmd = Extract<RunCommand, { command: "query" }>;

export async function handleQuery(
  cmd: QueryCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    let pattern = cmd.pattern;

    // If no explicit pattern but seeds + description, build pattern from schema
    if (!pattern && cmd.seeds && cmd.seeds.length > 0) {
      const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
      if (resolved.length === 0) {
        return errorResult("Could not resolve any seeds for pattern building.");
      }

      const schema = await getCachedGraphSchema();
      pattern = [];

      // Create a variable for each resolved seed with type constraint and ID filter
      for (let i = 0; i < resolved.length; i++) {
        const seed = resolved[i];
        pattern.push({
          var: `s${i}`,
          type: seed.type,
        });
      }

      // If there are exactly 2 seeds, try to infer an edge connecting them
      if (resolved.length === 2) {
        const edgeType = inferEdgeType(schema, resolved[0].type, resolved[1].type);
        if (edgeType) {
          pattern.push({
            var: "e0",
            edge: edgeType,
            from: "s0",
            to: "s1",
          });
        }
      }
    }

    if (!pattern || pattern.length === 0) {
      return errorResult(
        "query requires either a 'pattern' array or 'seeds' to build a pattern from.",
      );
    }

    // Build filters from resolved seeds (constrain var nodes to specific IDs)
    const filters: Record<string, unknown> = { ...cmd.filters };
    if (cmd.seeds) {
      const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
      for (let i = 0; i < resolved.length; i++) {
        filters[`s${i}.id`] = resolved[i].id;
      }
    }

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        nodeColumns?: string[];
        nodes?: Record<string, unknown[]>;
        matches: Array<{
          bindings: Record<string, string>;
          score?: number;
        }>;
        totalMatches?: number;
      };
    }>("/graph/patterns", {
      method: "POST",
      body: {
        pattern,
        returnVars: cmd.return_vars,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: Math.min(cmd.limit ?? 20, 100),
        select: cmd.select ? {
          edgeFields: cmd.select.edgeFields?.slice(0, 20),
          includeEvidence: cmd.select.includeEvidence,
        } : undefined,
      },
    });

    const matches = data.data?.matches ?? [];
    const total = data.data?.totalMatches ?? matches.length;

    return {
      text_summary: data.data?.textSummary ??
        `Pattern matched ${matches.length} results (${total} total)`,
      data: {
        pattern,
        matches: matches.slice(0, cmd.limit ?? 20),
        totalMatches: total,
        ...(data.data?.nodeColumns ? { nodeColumns: data.data.nodeColumns } : {}),
        ...(data.data?.nodes ? { nodes: data.data.nodes } : {}),
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}
