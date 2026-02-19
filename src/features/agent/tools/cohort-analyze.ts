import { tool } from "ai";
import { z } from "zod";
import { cohortFetch, AgentToolError } from "../lib/api-client";

/**
 * All 36 score columns available for topk and derive filters.
 * Matches the backend Score Columns table exactly.
 */
const SCORE_COLUMNS = [
  "cadd_phred",
  "cadd_raw",
  "revel",
  "alpha_missense",
  "gnomad_af",
  "gnomad_exome_af",
  "bravo_af",
  "linsight",
  "fathmm_xf",
  "apc_conservation",
  "apc_epigenetics",
  "apc_protein_function",
  "apc_proximity_to_coding",
  "apc_local_nucleotide_diversity",
  "apc_mutation_density",
  "apc_transcription_factor",
  "apc_mappability",
  "apc_micro_rna",
  "spliceai_ds_max",
  "pangolin_largest_ds",
  "sift_val",
  "polyphen_val",
  "gerp_rs",
  "priphcons",
  "mamphcons",
  "verphcons",
  "priphylop",
  "mamphylop",
  "verphylop",
  "tg_all",
  "polyphen2_hdiv",
  "polyphen2_hvar",
  "mutation_taster",
  "mutation_assessor",
  "recombination_rate",
  "nucdiv",
] as const;

const scoreColumnEnum = z.enum(SCORE_COLUMNS);

/**
 * Filter schema matching the v2 CohortFilter spec:
 * - Categorical: chromosome, gene, consequence, clinical_significance
 * - Generic numeric: score_above, score_below (with any score column as field)
 */
const cohortFilterSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chromosome"),
    value: z.string().describe("Chromosome value (e.g., '17')"),
  }),
  z.object({
    type: z.literal("gene"),
    values: z.array(z.string()).describe("Gene symbols (e.g., ['BRCA1', 'BRCA2'])"),
  }),
  z.object({
    type: z.literal("consequence"),
    values: z
      .array(z.string())
      .describe("Consequence types (e.g., ['missense_variant', 'frameshift_variant'])"),
  }),
  z.object({
    type: z.literal("clinical_significance"),
    values: z
      .array(z.string())
      .describe("ClinVar classifications (e.g., ['Pathogenic', 'Likely_pathogenic'])"),
  }),
  z.object({
    type: z.literal("score_above"),
    field: scoreColumnEnum.describe("Score column name"),
    threshold: z.number().describe("Minimum threshold (inclusive). Missing values → EXCLUDED."),
  }),
  z.object({
    type: z.literal("score_below"),
    field: scoreColumnEnum.describe("Score column name"),
    threshold: z
      .number()
      .describe(
        "Maximum threshold. For frequency fields (gnomad_af, gnomad_exome_af, bravo_af, tg_all), missing → INCLUDED. For others, missing → EXCLUDED.",
      ),
  }),
]);

export const analyzeCohort = tool({
  description: `Analyze an existing cohort with three operations. Cohorts can have 5,000+ variants — this tool is optimized for large-scale analysis. ALWAYS use this instead of looping lookupVariant or per-variant entity searches.
- **topk**: Top K variants by any of 36 score columns (cadd_phred, revel, alpha_missense, spliceai_ds_max, gnomad_af, apc_protein_function, apc_conservation, etc.). Note: "apc_*" scores = Annotation Principal Component, NOT the APC gene.
- **aggregate**: Group by field (gene, consequence, clinical_significance, frequency, chromosome)
- **derive**: Filter variants with AND logic to create a sub-cohort. Categorical filters: chromosome, gene, consequence, clinical_significance. Numeric filters: score_above/score_below with any score column (e.g., { type: "score_above", field: "cadd_phred", threshold: 20 }).
The derived cohort supports all operations (topk, aggregate, derive).`,
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID from createCohort or a previous derive"),
    operation: z
      .enum(["topk", "aggregate", "derive"])
      .describe("topk = top variants by score, aggregate = group-by counts, derive = filter to sub-cohort"),
    // topk params
    score: scoreColumnEnum
      .optional()
      .describe("Score column for topk (e.g., 'cadd_phred', 'revel', 'spliceai_ds_max')"),
    k: z
      .number()
      .optional()
      .describe("Number of top variants for topk (default 20, max 100)"),
    // aggregate params
    field: z
      .enum(["gene", "consequence", "clinical_significance", "frequency", "chromosome"])
      .optional()
      .describe("Field to aggregate on"),
    limit: z.number().optional().describe("Limit for aggregate results (default 50, max 200)"),
    // derive params
    filters: z
      .array(cohortFilterSchema)
      .optional()
      .describe("Filters for derive (AND logic). Use score_above/score_below for numeric filtering."),
    label: z
      .string()
      .optional()
      .describe("Label for derived sub-cohort"),
  }),
  execute: async ({ cohortId, operation, score, k, field, limit, filters, label }) => {
    try {
      const endpoint = `/cohorts/${encodeURIComponent(cohortId)}/${operation}`;

      let body: Record<string, unknown> = {};
      if (operation === "topk") {
        body = { score: score ?? "cadd_phred", k: k ?? 20 };
      } else if (operation === "aggregate") {
        body = { field: field ?? "gene", limit: limit ?? 50 };
      } else if (operation === "derive") {
        if (!filters?.length) {
          return { error: true, message: "derive requires at least one filter.", hint: "Use score_above, score_below, or categorical filters (gene, consequence, clinical_significance, chromosome)." };
        }
        body = { filters, label };
      }

      const result = await cohortFetch<Record<string, unknown>>(endpoint, {
        method: "POST",
        body,
        timeout: 60_000,
      });

      const output: Record<string, unknown> = {};

      if (result.text_summary) output.summary = result.text_summary;

      if (operation === "topk") {
        output.score = result.score;
        // Cap variants to requested k (max 50) to limit context
        const maxK = Math.min(k ?? 20, 50);
        const variants = Array.isArray(result.variants)
          ? (result.variants as unknown[]).slice(0, maxK)
          : result.variants;
        output.variants = variants;
      } else if (operation === "aggregate") {
        output.field = result.field;
        // Cap buckets to requested limit (max 100) to limit context
        const maxBuckets = Math.min(limit ?? 50, 100);
        const buckets = Array.isArray(result.buckets)
          ? (result.buckets as unknown[]).slice(0, maxBuckets)
          : result.buckets;
        output.buckets = buckets;
        output.totalVariants = result.total_variants;
      } else if (operation === "derive") {
        output.derivedCohortId = result.cohort_id;
        output.parentId = result.parent_id;
        output.filtersApplied = result.filters_applied;
        output.variantCount = result.vid_count;
        if (result.summary) output.childSummary = result.summary;
      }

      return output;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
