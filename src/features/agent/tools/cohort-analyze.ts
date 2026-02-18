import { tool } from "ai";
import { z } from "zod";
import { cohortFetch } from "../lib/api-client";

export const analyzeCohort = tool({
  description:
    "Analyze an existing cohort. Use 'derive' to filter variants (e.g., show only pathogenic, rare, or specific genes) — this creates a sub-cohort server-side in one call. Use 'topk' for top K variants by score (cadd_phred, revel, alphamissense, gnomad_af). Use 'aggregate' to group by field (gene, consequence, clinical_significance, frequency, chromosome). ALWAYS prefer 'derive' over calling lookupVariant in a loop.",
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID from createCohort"),
    operation: z
      .enum(["topk", "aggregate", "derive"])
      .describe("Analysis operation to run"),
    params: z
      .object({
        // topk params
        score: z
          .enum(["cadd_phred", "revel", "alphamissense", "gnomad_af"])
          .optional()
          .describe("Score field for topk"),
        k: z.number().optional().describe("Number of top variants for topk (max 100)"),
        // aggregate params
        field: z
          .enum(["gene", "consequence", "clinical_significance", "frequency", "chromosome"])
          .optional()
          .describe("Field to aggregate on"),
        limit: z.number().optional().describe("Limit for aggregate results (max 200)"),
        // derive params
        filters: z
          .array(
            z.object({
              type: z
                .enum([
                  "chromosome",
                  "gene",
                  "consequence",
                  "clinical_significance",
                  "frequency_below",
                  "frequency_above",
                  "cadd_phred_above",
                ])
                .describe("Filter type"),
              value: z.string().optional().describe("Single value (for chromosome filter)"),
              values: z
                .array(z.string())
                .optional()
                .describe("Multiple values (for gene, consequence, clinical_significance filters)"),
              threshold: z
                .number()
                .optional()
                .describe("Numeric threshold (for frequency_below, frequency_above, cadd_phred_above)"),
            }),
          )
          .optional()
          .describe("Filters for derive operation (AND logic)"),
        label: z
          .string()
          .optional()
          .describe("Label for derived cohort"),
      })
      .optional()
      .describe("Operation-specific parameters"),
  }),
  execute: async ({ cohortId, operation, params }) => {
    const endpoint = `/cohorts/${encodeURIComponent(cohortId)}/${operation}`;

    // Build operation-specific body
    let body: Record<string, unknown> = {};
    if (operation === "topk") {
      body = { score: params?.score ?? "cadd_phred", k: params?.k ?? 20 };
    } else if (operation === "aggregate") {
      body = { field: params?.field ?? "gene", limit: params?.limit ?? 50 };
    } else if (operation === "derive") {
      body = { filters: params?.filters ?? [], label: params?.label };
    }

    // Cohort API returns flat response (no data wrapper)
    const result = await cohortFetch<Record<string, unknown>>(endpoint, {
      method: "POST",
      body,
      timeout: 60_000,
    });

    // Build compressed output based on operation
    const output: Record<string, unknown> = {};

    if (result.text_summary) output.summary = result.text_summary;

    if (operation === "topk") {
      output.score = result.score;
      output.variants = result.variants;
    } else if (operation === "aggregate") {
      output.field = result.field;
      output.buckets = result.buckets;
      output.totalVariants = result.total_variants;
    } else if (operation === "derive") {
      output.derivedCohortId = result.cohort_id;
      output.parentId = result.parent_id;
      output.filtersApplied = result.filters_applied;
      output.variantCount = result.vid_count;
      // Derived cohorts include their own summary
      if (result.summary) output.childSummary = result.summary;
    }

    return output;
  },
});
