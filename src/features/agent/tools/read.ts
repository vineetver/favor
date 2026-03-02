/**
 * Read tool — path-based dispatch.
 * Replaces: getResultSlice, getCohortSchema (full), getEntityContext, lookupVariant, getEdgeDetail
 */

import { tool } from "ai";
import { z } from "zod";
import { agentFetch, cohortFetch, AgentToolError } from "../lib/api-client";

/** Internal columns to filter from schema */
const INTERNAL_COLUMNS = new Set([
  "variants_vid", "variants_chrom_id", "variants_position0",
  "variants_hash30", "variants_pos_bin_1m", "variants_is_hashed",
  "variants_position", "row_id",
]);

export const readTool = tool({
  description: `Read any workspace object by path.

PATHS:
  cohort/{id}/schema            — Full schema with columns, methods, auto_config
  cohort/{id}/sample?limit=50   — Sample rows
  cohort/{id}/profile           — Column stats, QC
  run/{cohort_id}/{run_id}      — Analytics run result
  run/{cohort_id}/{run_id}/viz/{chart_id} — Chart data
  artifact/{id}?offset=0&limit=50 — Artifact slice
  entity/{type}/{id}            — Entity profile with edge counts
  entity/{type}/{id}/context    — LLM-ready entity context
  variant/{query}               — Variant lookup (rsID, VCF, or vid)
  graph/schema                  — Full graph schema
  graph/schema/{type}           — Properties for a specific node/edge type`,
  inputSchema: z.object({
    path: z.string().describe("Resource path (e.g., 'cohort/abc-123/schema', 'entity/Gene/ENSG00000012048')"),
  }),
  execute: async ({ path }) => {
    try {
      // Parse the path
      const parts = path.split("/").filter(Boolean);
      const root = parts[0];

      // --- cohort/{id}/... ---
      if (root === "cohort" && parts.length >= 3) {
        const cohortId = parts[1];
        const sub = parts[2];

        if (sub === "schema") {
          return await readCohortSchema(cohortId);
        }
        if (sub === "sample") {
          const limit = extractQueryParam(path, "limit", 50);
          return await readCohortSample(cohortId, limit);
        }
        if (sub === "profile") {
          return await readCohortProfile(cohortId);
        }
      }

      // --- run/{cohort_id}/{run_id}[/viz/{chart_id}] ---
      if (root === "run" && parts.length >= 3) {
        const cohortId = parts[1];
        const runId = parts[2];
        if (parts[3] === "viz" && parts[4]) {
          return await readChartData(cohortId, runId, parts[4]);
        }
        return await readRunResult(cohortId, runId);
      }

      // --- artifact/{id} ---
      if (root === "artifact" && parts[1]) {
        const artifactId = parts[1];
        const offset = extractQueryParam(path, "offset", 0);
        const limit = extractQueryParam(path, "limit", 50);
        return await readArtifact(artifactId, offset, limit);
      }

      // --- entity/{type}/{id}[/context] ---
      if (root === "entity" && parts.length >= 3) {
        const type = parts[1];
        const id = parts[2];
        if (parts[3] === "context") {
          return await readEntityContext(type, id);
        }
        return await readEntityProfile(type, id);
      }

      // --- variant/{query} ---
      if (root === "variant" && parts[1]) {
        const query = parts.slice(1).join("/"); // handle VCF notation with slashes
        return await readVariant(query);
      }

      // --- graph/schema[/{type}] ---
      if (root === "graph" && parts[1] === "schema") {
        if (parts[2]) {
          return await readGraphSchemaType(parts[2]);
        }
        return await readGraphSchema();
      }

      return { error: true, message: `Unknown path: ${path}`, hint: "Check the path format in the tool description." };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});

// ---------------------------------------------------------------------------
// Path handlers
// ---------------------------------------------------------------------------

async function readCohortSchema(cohortId: string) {
  const resp = await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/schema`,
    { timeout: 30_000 },
  );

  // Filter internal columns
  const columns = Array.isArray(resp.columns)
    ? (resp.columns as Array<{ name: string; kind: string; role?: string }>)
        .filter((c) => !INTERNAL_COLUMNS.has(c.name))
    : [];

  const numeric = columns.filter((c) => c.kind === "numeric").map((c) => c.name);
  const categorical = columns.filter((c) => c.kind === "categorical").map((c) => c.name);
  const identity = columns.filter((c) => c.kind === "identity").map((c) => c.name);

  // Clean available methods
  const methods = Array.isArray(resp.available_methods)
    ? (resp.available_methods as Array<{ method: string; available: boolean; auto_config?: unknown }>)
        .filter((m) => m.available)
    : [];

  return {
    cohortId,
    rowCount: resp.row_count,
    dataType: resp.data_type ?? "variant_list",
    columns: { numeric, categorical, identity },
    capabilities: resp.capabilities,
    availableMethods: methods,
    summary: resp.text_summary,
    profile: resp.profile,
  };
}

async function readCohortSample(cohortId: string, limit: number) {
  const result = await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/rows`,
    { method: "POST", body: { limit: Math.min(limit, 100) }, timeout: 60_000 },
  );
  return {
    rows: Array.isArray(result.rows) ? (result.rows as unknown[]).slice(0, limit) : result.rows,
    total: result.total,
  };
}

async function readCohortProfile(cohortId: string) {
  const resp = await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/schema`,
    { timeout: 30_000 },
  );
  return { profile: resp.profile, summary: resp.text_summary };
}

async function readRunResult(cohortId: string, runId: string) {
  return await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/analytics/runs/${encodeURIComponent(runId)}`,
  );
}

async function readChartData(cohortId: string, runId: string, chartId: string) {
  return await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/analytics/runs/${encodeURIComponent(runId)}/viz?chart_id=${encodeURIComponent(chartId)}`,
  );
}

async function readArtifact(artifactId: string, offset: number, limit: number) {
  return await agentFetch<Record<string, unknown>>(
    `/agent/artifacts/${artifactId}?offset=${offset}&limit=${limit}`,
  );
}

async function readEntityProfile(type: string, id: string) {
  // GET /graph/{entity_type}/{id}?include=counts
  try {
    const resp = await agentFetch<{
      data: Record<string, unknown>;
      included?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }>(`/graph/${encodeURIComponent(type)}/${encodeURIComponent(id)}?include=counts`);

    return {
      entity: { type, id, ...(resp.data ?? {}) },
      counts: resp.included?.counts,
    };
  } catch (err) {
    if (err instanceof AgentToolError && err.status === 404) {
      return { error: true, message: `Entity not found: ${type}:${id}` };
    }
    throw err;
  }
}

async function readEntityContext(type: string, id: string) {
  // POST /graph/context — LLM-optimized entity context
  const resp = await agentFetch<{
    data: { entities: Array<Record<string, unknown>> };
  }>("/graph/context", {
    method: "POST",
    body: {
      entities: [{ type, id }],
      sections: ["summary", "neighbors", "evidence"],
      depth: "standard",
    },
  });
  return resp.data?.entities?.[0] ?? { type, id };
}

async function readVariant(query: string) {
  // Resolve the variant
  const resolveResult = await agentFetch<{
    results: Array<{
      query: string;
      status: string;
      entity?: { type: string; id: string; label: string };
    }>;
  }>("/graph/resolve", {
    method: "POST",
    body: { queries: [query] },
  });

  const match = resolveResult.results?.[0];
  if (!match || match.status.toLowerCase() !== "matched" || !match.entity) {
    return { error: true, message: `Variant not found: ${query}`, hint: "Check variant ID format (rs123, 1-12345-A-T, vid:123)." };
  }

  return { variant: match.entity };
}

async function readGraphSchema() {
  const resp = await agentFetch<{ data: Record<string, unknown> }>("/graph/schema");
  return resp.data;
}

async function readGraphSchemaType(type: string) {
  const resp = await agentFetch<{ data: Record<string, unknown> }>(`/graph/schema/properties/${type}`);
  return resp.data;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractQueryParam(path: string, param: string, defaultValue: number): number {
  const match = path.match(new RegExp(`[?&]${param}=(\\d+)`));
  return match ? parseInt(match[1], 10) : defaultValue;
}
