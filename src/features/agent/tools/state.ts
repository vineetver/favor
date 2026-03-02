/**
 * State tool — workspace snapshot.
 * Replaces: getCohortSchema (partially), getGraphSchema (partially), listResults, recallMemories
 */

import { tool } from "ai";
import { z } from "zod";
import { fetchSessionState, type SessionState } from "../lib/session-state";
import { cohortFetch, AgentToolError } from "../lib/api-client";

/** Internal column names to filter out */
const INTERNAL_COLUMNS = new Set([
  "variants_vid", "variants_chrom_id", "variants_position0",
  "variants_hash30", "variants_pos_bin_1m", "variants_is_hashed",
  "variants_position", "row_id",
]);

interface SchemaApiColumn {
  name: string;
  kind: "numeric" | "categorical" | "identity" | "array" | "select";
  role?: string;
}

interface MethodMatch {
  method: string;
  category: string;
  description: string;
  available: boolean;
}

export function createStateTool(sessionId: string) {
  return tool({
    description: `Get workspace snapshot: active cohort, schema digest, pinned entities, active jobs, recent artifacts, mode. Call at the start of each turn to orient, or explicitly to re-check state after changes.`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const { state } = await fetchSessionState(sessionId);

        // If there's an active cohort, enrich with live schema
        let schema: {
          columns: Array<{ name: string; kind: string; role: string }>;
          numeric_columns: string[];
          categorical_columns: string[];
          available_methods: string[];
          capabilities: Record<string, unknown> | null;
        } | null = null;

        if (state.active_cohort_id) {
          try {
            const resp = await cohortFetch<{
              row_count?: number;
              data_type?: string;
              columns?: SchemaApiColumn[];
              available_methods?: MethodMatch[];
              capabilities?: Record<string, unknown>;
            }>(`/cohorts/${encodeURIComponent(state.active_cohort_id)}/schema`, {
              timeout: 15_000,
            });

            const columns = (resp.columns ?? [])
              .filter((c) => !INTERNAL_COLUMNS.has(c.name))
              .map((c) => ({ name: c.name, kind: c.kind, role: c.role ?? c.kind }));

            schema = {
              columns,
              numeric_columns: columns.filter((c) => c.kind === "numeric").map((c) => c.name),
              categorical_columns: columns.filter((c) => c.kind === "categorical").map((c) => c.name),
              available_methods: (resp.available_methods ?? [])
                .filter((m) => m.available)
                .map((m) => m.method),
              capabilities: resp.capabilities ?? null,
            };

            // Update state with fresh data
            state.cohort_row_count = resp.row_count ?? state.cohort_row_count;
            state.cohort_status = "ready";
          } catch {
            // Schema fetch failed — use cached data from state
          }
        }

        const output: Record<string, unknown> = {
          mode: state.mode ?? "mixed",
          active_cohort: state.active_cohort_id
            ? {
                id: state.active_cohort_id,
                status: state.cohort_status ?? "unknown",
                row_count: state.cohort_row_count,
              }
            : null,
          schema,
          pinned_entities: (state.pinned_entities ?? []).slice(0, 10).map((e) => ({
            type: e.type,
            id: e.id,
            label: e.label ?? e.query,
          })),
          active_jobs: (state.active_job_ids ?? []).map((id) => ({ id })),
          derived_cohorts: (state.derived_cohorts ?? []).slice(0, 5),
          graph_portal: state.graph_portal ?? "biokg",
        };

        return output;
      } catch (err) {
        if (err instanceof AgentToolError) return err.toToolResult();
        throw err;
      }
    },
    toModelOutput: async (opts: { toolCallId: string; input: unknown; output: unknown }) => {
      const state = opts.output as Record<string, unknown>;
      const schema = state.schema as {
        columns: unknown[];
        numeric_columns: string[];
        categorical_columns: string[];
      } | null;

      if (schema && schema.columns.length > 30) {
        return jsonOut({
          ...state,
          schema: {
            ...schema,
            columns: schema.columns.slice(0, 30),
            _columns_truncation: { truncated: true, returned: 30, total: schema.columns.length },
          },
        });
      }

      return jsonOut(state);
    },
  });
}

/** Type-safe JSON output for toModelOutput */
function jsonOut(value: unknown) {
  return { type: "json" as const, value: value as null };
}
