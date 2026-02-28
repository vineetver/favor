import { tool } from "ai";
import { z } from "zod";
import { cohortFetch, AgentToolError } from "../lib/api-client";

/**
 * All 36 score columns available for sorting, filtering, groupby, compute, prioritize.
 * Matches the backend Score Columns table exactly.
 */
export const SCORE_COLUMNS = [
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

/**
 * Filter schema matching the v2 CohortFilter spec:
 * - Categorical: chromosome, gene, consequence, clinical_significance
 * - Generic numeric: score_above, score_below (field validated server-side against dynamic schema)
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
    field: z.string().describe("Numeric column name from getCohortSchema"),
    threshold: z.number().describe("Minimum threshold (inclusive). Missing values → EXCLUDED."),
  }),
  z.object({
    type: z.literal("score_below"),
    field: z.string().describe("Numeric column name from getCohortSchema"),
    threshold: z
      .number()
      .describe(
        "Maximum threshold. For frequency fields (gnomad_af, gnomad_exome_af, bravo_af, tg_all), missing → INCLUDED. For others, missing → EXCLUDED.",
      ),
  }),
]);

export const analyzeCohort = tool({
  description: `Analyze an existing cohort with six operations. Works with all cohort data types (variant_list, gwas_sumstats, credible_set, fine_mapping). ALWAYS call getCohortSchema first to discover available columns — column names vary by data type.
- **rows**: Query/sort/filter rows. Use sort + desc + limit for "top K" queries. select controls which columns are returned.
- **groupby**: Group-by with aggregate metrics. Use group_by (any column name) + optional metrics[] for per-group stats (min/max/mean/median).
- **derive**: Filter variants with AND logic to create a sub-cohort. The derived cohort supports all operations.
- **prioritize**: Multi-criteria ranking via weighted rank product. Provide criteria: [{ column, desc?, weight? }]. Lower rank_score = better.
- **compute**: Weighted composite score from multiple numeric columns. Provide weights: [{ column, weight }], normalize?: boolean.
- **correlation**: Pearson correlation between two numeric columns. Provide x and y column names.
Note: For variant_list cohorts, "apc_*" scores = Annotation Principal Component, NOT the APC gene.`,
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID from createCohort or a previous derive"),
    operation: z
      .enum(["rows", "groupby", "derive", "prioritize", "compute", "correlation"])
      .describe("rows = query/sort/filter, groupby = group-by counts+metrics, derive = filter to sub-cohort, prioritize = multi-criteria rank, compute = weighted composite, correlation = Pearson r"),
    // rows params
    sort: z.string().optional().describe("Column to sort by (for rows operation, e.g. 'cadd_phred')"),
    desc: z.boolean().optional().describe("Sort descending (default true for rows)"),
    select: z.array(z.string()).optional().describe("Columns to return (for rows). Default: variant_vcf, rsid, chromosome, gene, consequence, cadd_phred, gnomad_af"),
    // groupby params
    group_by: z.string().optional().describe("Column to group by (for groupby, e.g. 'gene', 'consequence', 'chromosome' — any column)"),
    metrics: z.array(z.string()).optional().describe("Numeric columns for per-group stats (for groupby, e.g. ['cadd_phred', 'revel'])"),
    // shared
    limit: z.number().optional().describe("Max rows/groups to return (rows default 50 max 500, groupby default 100 max 1000, prioritize/compute default 50 max 500)"),
    filters: z
      .array(cohortFilterSchema)
      .optional()
      .describe("Filters (AND logic). Used by rows, groupby, derive, prioritize, compute, correlation."),
    // derive params
    label: z.string().optional().describe("Label for derived sub-cohort (derive only)"),
    // prioritize params
    criteria: z
      .array(z.object({
        column: z.string().describe("Score column name"),
        desc: z.boolean().optional().describe("Higher values rank first (default true)"),
        weight: z.number().optional().describe("Relative weight (default 1.0)"),
      }))
      .optional()
      .describe("Ranking criteria for prioritize (1-20 entries)"),
    // compute params
    weights: z
      .array(z.object({
        column: z.string().describe("Score column name"),
        weight: z.number().describe("Weight for this column"),
      }))
      .optional()
      .describe("Column weights for compute (1-20 entries)"),
    normalize: z.boolean().optional().describe("Min-max normalize before weighting (for compute, default false)"),
    // correlation params
    x: z.string().optional().describe("First numeric column (for correlation)"),
    y: z.string().optional().describe("Second numeric column (for correlation)"),
  }),
  execute: async ({ cohortId, operation, sort, desc, select, group_by, metrics, limit, filters, label, criteria, weights, normalize, x, y }) => {
    try {
      // Map operation to correct API endpoint
      const endpointOp = operation === "rows" ? "rows"
        : operation === "groupby" ? "groupby"
        : operation === "derive" ? "derive"
        : operation === "prioritize" ? "prioritize"
        : operation === "compute" ? "compute"
        : "correlation";
      const endpoint = `/cohorts/${encodeURIComponent(cohortId)}/${endpointOp}`;

      let body: Record<string, unknown> = {};

      if (operation === "rows") {
        body = {
          ...(sort && { sort }),
          ...(sort && { desc: desc ?? true }),
          ...(limit && { limit }),
          ...(select && { select }),
          ...(filters?.length && { filters }),
        };
      } else if (operation === "groupby") {
        body = {
          group_by: group_by ?? "gene",
          ...(metrics?.length && { metrics }),
          ...(limit && { limit }),
          ...(filters?.length && { filters }),
        };
      } else if (operation === "derive") {
        if (!filters?.length) {
          return { error: true, message: "derive requires at least one filter.", hint: "Use score_above, score_below, or categorical filters (gene, consequence, clinical_significance, chromosome)." };
        }
        body = { filters, ...(label && { label }) };
      } else if (operation === "prioritize") {
        if (!criteria?.length) {
          return { error: true, message: "prioritize requires at least one criterion.", hint: "Provide criteria: [{ column: 'cadd_phred', desc: true, weight: 1.0 }]" };
        }
        body = {
          criteria,
          ...(limit && { limit }),
          ...(filters?.length && { filters }),
        };
      } else if (operation === "compute") {
        if (!weights?.length) {
          return { error: true, message: "compute requires at least one weight.", hint: "Provide weights: [{ column: 'cadd_phred', weight: 0.5 }]" };
        }
        body = {
          weights,
          ...(normalize != null && { normalize }),
          ...(limit && { limit }),
          ...(filters?.length && { filters }),
        };
      } else if (operation === "correlation") {
        if (!x || !y) {
          return { error: true, message: "correlation requires x and y column names.", hint: "Provide x and y (e.g., x='cadd_phred', y='revel')" };
        }
        body = {
          x,
          y,
          ...(filters?.length && { filters }),
        };
      }

      const result = await cohortFetch<Record<string, unknown>>(endpoint, {
        method: "POST",
        body,
        timeout: 60_000,
      });

      const output: Record<string, unknown> = {};

      if (result.text_summary) output.summary = result.text_summary;

      if (operation === "rows") {
        const maxRows = Math.min(limit ?? 50, 100);
        const rows = Array.isArray(result.rows)
          ? (result.rows as unknown[]).slice(0, maxRows)
          : result.rows;
        output.rows = rows;
        output.total = result.total;
      } else if (operation === "groupby") {
        output.group_by = result.group_by;
        const maxBuckets = Math.min(limit ?? 100, 200);
        const buckets = Array.isArray(result.buckets)
          ? (result.buckets as unknown[]).slice(0, maxBuckets)
          : result.buckets;
        output.buckets = buckets;
        output.total_groups = result.total_groups;
      } else if (operation === "derive") {
        output.derivedCohortId = result.cohort_id;
        output.parentId = result.parent_id;
        output.filtersApplied = result.filters_applied;
        output.variantCount = result.vid_count;
        if (result.summary) output.childSummary = result.summary;
      } else if (operation === "prioritize") {
        output.criteria = result.criteria;
        const rows = Array.isArray(result.rows)
          ? (result.rows as unknown[]).slice(0, Math.min(limit ?? 50, 100))
          : result.rows;
        output.rows = rows;
        output.total_ranked = result.total_ranked;
      } else if (operation === "compute") {
        const rows = Array.isArray(result.rows)
          ? (result.rows as unknown[]).slice(0, Math.min(limit ?? 50, 100))
          : result.rows;
        output.rows = rows;
        output.total_scored = result.total_scored;
      } else if (operation === "correlation") {
        output.x = result.x;
        output.y = result.y;
        output.r = result.r;
        output.n = result.n;
        output.x_mean = result.x_mean;
        output.y_mean = result.y_mean;
        output.x_stddev = result.x_stddev;
        output.y_stddev = result.y_stddev;
      }

      return output;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
