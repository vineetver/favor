import { tool } from "ai";
import { z } from "zod";
import { cohortFetch, AgentToolError } from "../lib/api-client";
import { SCORE_COLUMNS } from "./cohort-analyze";

/**
 * Cohort column categories for schema preflight.
 * Returned to the specialist so it only uses valid column names.
 */
export interface CohortColumns {
  score: string[];       // 36 numeric columns
  categorical: string[]; // chromosome, gene, consequence, clinical_significance
  select: string[];      // all columns valid for rows select
}

// Cache: columns are static per cohort, so we cache per cohort ID
const schemaCache = new Map<string, { columns: CohortColumns; rowCount: number; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

const CATEGORICAL_COLUMNS = ["chromosome", "gene", "consequence", "clinical_significance"] as const;

export const getCohortSchema = tool({
  description:
    "REQUIRED before any cohort analysis. Returns available columns (score, categorical, select) and row count for a cohort. Use this to discover valid column names — never guess column names. Lightweight and cached.",
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID to inspect"),
  }),
  execute: async ({ cohortId }) => {
    try {
      // Check cache
      const cached = schemaCache.get(cohortId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return { cohortId, rowCount: cached.rowCount, columns: cached.columns };
      }

      // Fetch schema endpoint
      const resp = await cohortFetch<{
        row_count?: number;
        text_summary?: string;
      }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, { timeout: 30_000 });

      const columns: CohortColumns = {
        score: [...SCORE_COLUMNS],
        categorical: [...CATEGORICAL_COLUMNS],
        select: [
          "variant_vcf", "rsid", "chromosome", "gene", "consequence",
          "clinical_significance", ...SCORE_COLUMNS,
        ],
      };

      const rowCount = resp.row_count ?? 0;
      const result = {
        cohortId,
        rowCount,
        summary: resp.text_summary,
        columns,
      };

      schemaCache.set(cohortId, { columns, rowCount, ts: Date.now() });
      return result;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
