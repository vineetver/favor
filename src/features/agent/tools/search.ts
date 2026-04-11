/**
 * Search tool — multi-scope search.
 * Replaces: searchEntities, recallMemories (search), listResults (search)
 */

import { tool } from "ai";
import { z } from "zod";
import { AgentToolError, agentFetch, cohortFetch } from "../lib/api-client";

const SCOPE_VALUES = [
  "entities",
  "columns",
  "methods",
  "artifacts",
  "memories",
  "all",
] as const;

/** Internal columns to hide */
const INTERNAL_COLUMNS = new Set([
  "variants_vid",
  "variants_chrom_id",
  "variants_position0",
  "variants_hash30",
  "variants_pos_bin_1m",
  "variants_is_hashed",
  "variants_position",
  "row_id",
]);

export function createSearchTool(
  sessionId: string,
  activeCohortId?: () => string | null,
) {
  return tool({
    description: `Search across multiple domains. Use scope to narrow results.

SCOPES:
  entities  — Search graph entity names (genes, diseases, drugs, variants, pathways)
  columns   — Search column names in active cohort schema
  methods   — Search analytics methods available for active cohort
  artifacts — Search previous results and artifacts in this session
  memories  — Search cross-session memories
  all       — Search everything (default)`,
    inputSchema: z.object({
      query: z.string().describe("Search term"),
      scope: z
        .enum(SCOPE_VALUES)
        .optional()
        .default("all")
        .describe("Search domain (default: all)"),
    }),
    execute: async ({ query, scope }) => {
      try {
        const results: Record<string, unknown> = {};
        const searchScope = scope ?? "all";

        // Entities
        if (searchScope === "entities" || searchScope === "all") {
          try {
            const params = new URLSearchParams();
            params.set("q", query);
            params.set("limit", "10");

            const data = await agentFetch<{
              data: {
                results: Array<{
                  entity: {
                    type: string;
                    id: string;
                    label: string;
                    subtitle?: string;
                  };
                  match: { confidence: number; matchTier?: string };
                }>;
              };
            }>(`/graph/search?${params.toString()}`);

            const MAX_SUB = 150;
            results.entities = (data.data?.results ?? [])
              .slice(0, 5)
              .map((r) => ({
                type: r.entity.type,
                id: r.entity.id,
                label: r.entity.label,
                subtitle:
                  r.entity.subtitle && r.entity.subtitle.length > MAX_SUB
                    ? `${r.entity.subtitle.slice(0, MAX_SUB).trimEnd()}…`
                    : r.entity.subtitle,
                score: r.match.confidence,
              }));
          } catch {
            results.entities = [];
          }
        }

        // Columns
        if (
          (searchScope === "columns" || searchScope === "all") &&
          activeCohortId?.()
        ) {
          try {
            const cohortId = activeCohortId()!;
            const resp = await cohortFetch<{
              columns?: Array<{ name: string; kind: string; role?: string }>;
            }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, {
              timeout: 15_000,
            });

            const allColumns = (resp.columns ?? []).filter(
              (c) => !INTERNAL_COLUMNS.has(c.name),
            );
            const q = query.toLowerCase();
            const matched = allColumns.filter(
              (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.role ?? "").toLowerCase().includes(q),
            );
            results.columns = matched.slice(0, 10).map((c) => ({
              name: c.name,
              kind: c.kind,
              role: c.role,
            }));
          } catch {
            results.columns = [];
          }
        }

        // Methods
        if (
          (searchScope === "methods" || searchScope === "all") &&
          activeCohortId?.()
        ) {
          try {
            const cohortId = activeCohortId()!;
            const resp = await cohortFetch<{
              available_methods?: Array<{
                method: string;
                category: string;
                description: string;
                available: boolean;
                auto_config?: Record<string, unknown>;
              }>;
            }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, {
              timeout: 15_000,
            });

            const q = query.toLowerCase();
            const matched = (resp.available_methods ?? [])
              .filter((m) => m.available)
              .filter(
                (m) =>
                  m.method.toLowerCase().includes(q) ||
                  m.category.toLowerCase().includes(q) ||
                  m.description.toLowerCase().includes(q),
              );
            results.methods = matched.slice(0, 10).map((m) => ({
              method: m.method,
              category: m.category,
              description: m.description,
              auto_config: m.auto_config,
            }));
          } catch {
            results.methods = [];
          }
        }

        // Artifacts
        if (searchScope === "artifacts" || searchScope === "all") {
          try {
            const data = await agentFetch<{
              results?: Array<{
                type: string;
                id: number;
                score: number;
                snippet: string;
              }>;
            }>(`/agent/sessions/${sessionId}/search`, {
              method: "POST",
              body: { query, types: ["artifact"], limit: 5 },
            });
            results.artifacts = data.results ?? [];
          } catch {
            results.artifacts = [];
          }
        }

        // Memories
        if (searchScope === "memories" || searchScope === "all") {
          try {
            const data = await agentFetch<{
              results: Array<{
                id: number;
                memory_key: string | null;
                content: string;
                score?: number;
              }>;
            }>("/agent/memories/search", {
              method: "POST",
              body: { query, limit: 5 },
            });
            results.memories = (data.results ?? []).slice(0, 5).map((m) => ({
              id: m.id,
              key: m.memory_key,
              content: m.content,
              score: m.score,
            }));
          } catch {
            results.memories = [];
          }
        }

        return results;
      } catch (err) {
        if (err instanceof AgentToolError) return err.toToolResult();
        throw err;
      }
    },
    toModelOutput: async (opts: {
      toolCallId: string;
      input: unknown;
      output: unknown;
    }) => {
      const results = opts.output as Record<string, unknown>;
      if (results.error) return jsonOut(results);

      const compact: Record<string, unknown> = { ...results };

      // Cap entity results to 5 for model context
      if (Array.isArray(compact.entities)) {
        const full = compact.entities as unknown[];
        if (full.length > 5) {
          compact.entities = full.slice(0, 5);
          compact._entities_truncation = {
            truncated: true,
            returned: 5,
            total: full.length,
          };
        }
      }

      // Cap column results to 10
      if (Array.isArray(compact.columns)) {
        const full = compact.columns as unknown[];
        if (full.length > 10) {
          compact.columns = full.slice(0, 10);
          compact._columns_truncation = {
            truncated: true,
            returned: 10,
            total: full.length,
          };
        }
      }

      return jsonOut(compact);
    },
  });
}

/** Type-safe JSON output for toModelOutput */
function jsonOut(value: unknown) {
  return { type: "json" as const, value: value as null };
}
