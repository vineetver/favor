import { tool } from "ai";
import { z } from "zod";
import { cohortFetch, AgentToolError } from "../lib/api-client";
import { SCORE_COLUMNS } from "./cohort-analyze";
import type { DataType } from "@features/batch/types";

/**
 * Cohort column categories for schema preflight.
 * Returned to the specialist so it only uses valid column names.
 */
export interface CohortColumns {
  numeric: string[];      // numeric score columns
  categorical: string[];  // chromosome, gene, consequence, etc.
  identity: string[];     // variant_vcf, rsid, etc.
  select: string[];       // all columns valid for rows select
}

// Cache: columns per cohort ID
const schemaCache = new Map<
  string,
  { columns: CohortColumns; rowCount: number; dataType?: DataType; capabilities?: string[]; ts: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

const CATEGORICAL_COLUMNS = ["chromosome", "gene", "consequence", "clinical_significance"] as const;

interface SchemaApiColumn {
  name: string;
  kind: "numeric" | "categorical" | "identity" | "array" | "select";
}

export const getCohortSchema = tool({
  description:
    "REQUIRED before any cohort analysis. Returns available columns (numeric, categorical, identity, select), row count, data type, and capabilities for a cohort. Use this to discover valid column names — never guess column names. Lightweight and cached.",
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID to inspect"),
  }),
  execute: async ({ cohortId }) => {
    try {
      // Check cache
      const cached = schemaCache.get(cohortId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return {
          cohortId,
          rowCount: cached.rowCount,
          dataType: cached.dataType ?? "variant_list",
          capabilities: cached.capabilities,
          columns: cached.columns,
        };
      }

      // Fetch schema endpoint
      const resp = await cohortFetch<{
        row_count?: number;
        text_summary?: string;
        data_type?: DataType;
        capabilities?: string[];
        profile?: Record<string, unknown>;
        columns?: SchemaApiColumn[];
      }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, { timeout: 30_000 });

      let columns: CohortColumns;

      if (resp.columns && Array.isArray(resp.columns) && resp.columns.length > 0) {
        // Dynamic: parse columns from API response
        const numeric: string[] = [];
        const categorical: string[] = [];
        const identity: string[] = [];
        const select: string[] = [];

        for (const col of resp.columns) {
          select.push(col.name);
          switch (col.kind) {
            case "numeric":
              numeric.push(col.name);
              break;
            case "categorical":
              categorical.push(col.name);
              break;
            case "identity":
              identity.push(col.name);
              break;
            case "array":
              // Arrays are selectable but not numeric/categorical
              break;
            case "select":
              // Already added to select
              break;
          }
        }

        columns = { numeric, categorical, identity, select };
      } else {
        // Fallback: hardcoded variant_list columns for backward compat
        columns = {
          numeric: [...SCORE_COLUMNS],
          categorical: [...CATEGORICAL_COLUMNS],
          identity: ["variant_vcf", "rsid"],
          select: [
            "variant_vcf", "rsid", "chromosome", "gene", "consequence",
            "clinical_significance", ...SCORE_COLUMNS,
          ],
        };
      }

      const rowCount = resp.row_count ?? 0;
      const dataType = resp.data_type ?? "variant_list";
      const capabilities = resp.capabilities;

      const result = {
        cohortId,
        rowCount,
        dataType,
        capabilities,
        columns,
        summary: resp.text_summary,
        profile: resp.profile,
      };

      schemaCache.set(cohortId, { columns, rowCount, dataType, capabilities, ts: Date.now() });
      return result;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
