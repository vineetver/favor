/**
 * Agent-facing Run schema — 7 commands funneled through executeRun().
 *
 * Thin transform layer that maps a smaller, stable agent command palette
 * into the full internal command set. The proven gate→handler→enrich
 * pipeline (executeRun) is unchanged.
 *
 * Agent commands:
 *   cohort     → rows, groupby, derive, prioritize, compute
 *   analyze    → correlation, analytics
 *   explore    → explore (pass-through)
 *   traverse   → traverse (pass-through)
 *   query      → query (pass-through)
 *   workspace  → set_cohort, remember, export, pin
 */

import { z } from "zod";
import { tool } from "ai";
import { executeRun, type RunContext } from "./index";
import type { RunResult } from "./types";
import { compactRunForModel } from "./compactify";

// ---------------------------------------------------------------------------
// Sub-schemas (replicated from flat schema — cannot import without modifying)
// ---------------------------------------------------------------------------

const targetIntents = z.enum([
  "diseases", "drugs", "pathways", "variants",
  "phenotypes", "tissues", "genes", "proteins", "compounds",
  "protein_domains", "ccres",
  "side_effects", "go_terms", "metabolites", "studies", "signals",
]);

const flatSeedRef = z.object({
  type: z.string().optional().describe("Entity type (e.g. Gene, Disease)"),
  id: z.string().optional().describe("Entity ID"),
  label: z.string().optional().describe("Fuzzy label for search (e.g. 'BRCA1')"),
  from_artifact: z.number().optional().describe("Artifact ID to extract entities from"),
  field: z.string().optional().describe("Field within artifact"),
  from_cohort: z.string().optional().describe("Cohort ID to extract top entities from"),
  top: z.number().optional().describe("Number of top entities from cohort"),
});

const flatCohortFilter = z.object({
  type: z.enum(["chromosome", "gene", "consequence", "clinical_significance", "score_above", "score_below"]),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
  field: z.string().optional(),
  threshold: z.number().optional(),
});

const flatTraverseStep = z.object({
  into: targetIntents.optional(),
  enrich: targetIntents.optional(),
  top: z.number().optional(),
  sort: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  p_cutoff: z.number().optional(),
});

const criterion = z.object({
  column: z.string(),
  desc: z.boolean().optional(),
  weight: z.number().optional(),
});

const weight = z.object({
  column: z.string(),
  weight: z.number(),
});

// ---------------------------------------------------------------------------
// Agent input schema — 7 commands, flat structure
// ---------------------------------------------------------------------------

export const agentInputSchema = z.object({
  command: z.enum(["cohort", "analyze", "explore", "traverse", "query", "workspace"]),
  op: z.string().optional().describe(
    "Sub-operation: cohort(rows|groupby|derive|rank|score), " +
    "analyze(correlation|regression|feature_importance|multiple_testing|bootstrap_ci|permutation_test|pca|cluster|prs_association), " +
    "workspace(select_cohort|memo|export|bookmark_entities)",
  ),

  // --- cohort common ---
  cohort_id: z.string().optional().describe("Cohort ID (uses active cohort if omitted)"),
  select: z.array(z.string()).optional().describe("Columns to return"),
  filters: z.union([
    z.array(flatCohortFilter),
    z.record(z.unknown()),
  ]).optional().describe("Filters (array for cohort, object for graph)"),
  sort: z.string().optional().describe("Sort column"),
  desc: z.boolean().optional().describe("Sort descending"),
  limit: z.number().optional().describe("Max results"),
  offset: z.number().optional().describe("Pagination offset"),

  // --- cohort.groupby ---
  group_by: z.string().optional().describe("Column to group by"),
  metrics: z.array(z.string()).optional().describe("Aggregate metrics"),
  bin_width: z.number().optional().describe("Numeric bin width"),

  // --- cohort.derive ---
  label: z.string().optional().describe("Label for derived cohort"),

  // --- cohort.rank ---
  criteria: z.array(criterion).optional().describe("Ranking criteria [{column, desc?, weight?}]"),

  // --- cohort.score ---
  weights: z.array(weight).optional().describe("Weighted score [{column, weight}]"),
  normalize: z.boolean().optional().describe("Normalize before scoring"),

  // --- analyze.correlation ---
  x: z.string().optional().describe("X column (correlation)"),
  y: z.string().optional().describe("Y column (correlation)"),

  // --- analyze: analytics params (flat) ---
  method: z.string().optional().describe("Analytics method or sub-type"),
  features: z.object({
    numeric: z.array(z.string()),
    categorical: z.array(z.string()).optional(),
    transforms: z.array(z.object({
      type: z.enum(["log1p", "standardize", "min_max_scale"]),
      field: z.string().optional(),
      fields: z.array(z.string()).optional(),
    })).optional(),
    missing: z.enum(["median", "mean", "drop"]).optional(),
  }).optional().describe("Feature specification"),
  target: z.union([
    targetIntents,
    z.object({
      field: z.string(),
      positive_values: z.array(z.string()).optional(),
    }),
  ]).optional().describe("Target: intent string (explore) or {field, positive_values?} (analytics)"),
  validation: z.object({
    split: z.enum(["holdout", "kfold"]),
    k: z.number().optional(),
    test_fraction: z.number().optional(),
    seed: z.number().optional(),
  }).optional().describe("Validation strategy"),
  regularization: z.object({
    penalty: z.enum(["l1", "l2", "elasticnet"]),
    l1_ratio: z.number().optional(),
    lambda: z.number().optional(),
  }).optional(),
  l1_ratio: z.number().optional(),
  lambda: z.number().optional(),
  n_components: z.number().optional().describe("PCA components"),
  k: z.number().optional().describe("Number of clusters (kmeans)"),
  n_clusters: z.number().optional().describe("Number of clusters (hierarchical)"),
  linkage: z.enum(["ward", "complete", "average", "single"]).optional(),
  n_repeats: z.number().optional(),
  statistic: z.object({ stat: z.string() }).optional().describe("Bootstrap CI statistic"),
  columns: z.array(z.string()).optional().describe("Columns for bootstrap CI"),
  n_bootstrap: z.number().optional(),
  confidence: z.number().optional(),
  x_column: z.string().optional().describe("X column (permutation test)"),
  y_column: z.string().optional().describe("Y column (permutation test)"),
  n_permutations: z.number().optional(),
  p_value_column: z.string().optional().describe("P-value column (multiple testing)"),
  max_iterations: z.number().optional(),

  // --- explore ---
  mode: z.string().optional().describe("Sub-mode: explore(neighbors|compare|enrich|similar|context|aggregate), traverse(chain|paths)"),
  seeds: z.array(flatSeedRef).optional().describe("Seed entities (explore, query)"),
  into: z.array(targetIntents).optional().describe("Target intents (explore neighbors)"),
  depth: z.number().optional().describe("Traversal depth"),
  edge_type: z.string().optional().describe("Edge type"),
  direction: z.enum(["in", "out"]).optional().describe("Edge direction"),
  p_cutoff: z.number().optional().describe("P-value cutoff (enrich)"),
  edge_types: z.array(z.string()).optional().describe("Edge types filter"),
  top_k: z.number().optional().describe("Top K similar"),
  sections: z.array(z.string()).optional().describe("Context sections"),
  context_depth: z.enum(["minimal", "standard", "detailed"]).optional(),
  metric: z.enum(["count", "avg", "sum", "min", "max"]).optional(),
  score_field: z.string().optional(),

  // --- traverse ---
  seed: flatSeedRef.optional().describe("Single seed (traverse chain)"),
  steps: z.array(flatTraverseStep).optional().describe("Traversal steps"),
  from: z.string().optional().describe("Source 'Type:ID' (traverse paths)"),
  to: z.string().optional().describe("Target 'Type:ID' (traverse paths)"),
  max_hops: z.number().optional(),
  include_edge_detail: z.boolean().optional(),

  // --- query ---
  description: z.string().optional().describe("Natural language pattern description"),
  pattern: z.array(z.object({
    var: z.string(),
    type: z.string().optional(),
    edge: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })).optional().describe("Structural pattern"),
  return_vars: z.array(z.string()).optional(),

  // --- workspace ---
  entities: z.array(flatSeedRef).optional().describe("Entities to bookmark [{type, id, label}]"),
  key: z.string().optional().describe("Memo key"),
  content: z.string().optional().describe("Memo content"),
  value: z.record(z.unknown()).optional().describe("Structured memo value"),
});

type AgentInput = z.infer<typeof agentInputSchema>;

// ---------------------------------------------------------------------------
// Analytics param construction
// ---------------------------------------------------------------------------

/** Field keys that belong inside the analytics `params` object */
const ANALYTICS_PARAM_KEYS = [
  "features", "target", "validation", "regularization",
  "l1_ratio", "lambda", "n_components",
  "k", "max_iterations", "n_clusters", "linkage",
  "method", "n_repeats",
  "statistic", "columns", "n_bootstrap", "confidence",
  "x_column", "y_column", "n_permutations",
  "p_value_column",
] as const;

/** Resolve agent op + method to internal analytics task type */
function resolveAnalyticsType(op: string | undefined, method?: string): string {
  switch (op) {
    case "regression":         return method ?? "linear_regression";
    case "feature_importance": return "feature_importance";
    case "multiple_testing":   return "multiple_testing_correction";
    case "bootstrap_ci":       return "bootstrap_ci";
    case "permutation_test":   return "permutation_test";
    case "pca":                return "pca";
    case "cluster":            return method ?? "kmeans";
    case "prs_association":    return "linear_regression";
    default:                   return method ?? op ?? "unknown";
  }
}

/** Build analytics params from flat agent fields */
function buildAnalyticsParams(
  type: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = { type };
  for (const key of ANALYTICS_PARAM_KEYS) {
    if (fields[key] !== undefined) {
      params[key] = fields[key];
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Transform: agent input → internal executeRun input
// ---------------------------------------------------------------------------

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const COHORT_OP_MAP: Record<string, string> = {
  rows: "rows",
  groupby: "groupby",
  derive: "derive",
  rank: "prioritize",
  score: "compute",
};

export function transformAgentInputToRunInput(
  input: AgentInput,
): Record<string, unknown> {
  const { command, op, ...rest } = input;
  const fields = rest as Record<string, unknown>;

  switch (command) {
    case "cohort": {
      const internalCmd = COHORT_OP_MAP[op ?? "rows"] ?? "rows";
      return stripUndefined({ command: internalCmd, ...fields });
    }

    case "analyze": {
      if (op === "correlation") {
        return stripUndefined({
          command: "correlation",
          cohort_id: fields.cohort_id,
          x: fields.x,
          y: fields.y,
          filters: fields.filters,
        });
      }
      const analyticsType = resolveAnalyticsType(op, fields.method as string | undefined);
      const params = buildAnalyticsParams(analyticsType, fields);
      return stripUndefined({
        command: "analytics",
        cohort_id: fields.cohort_id,
        method: analyticsType,
        params,
      });
    }

    case "explore":
    case "traverse":
    case "query":
      return stripUndefined({ command, ...fields });

    case "workspace": {
      switch (op) {
        case "select_cohort":
          return stripUndefined({ command: "set_cohort", cohort_id: fields.cohort_id });
        case "memo":
          return stripUndefined({ command: "remember", key: fields.key, content: fields.content, value: fields.value });
        case "export":
          return stripUndefined({ command: "export", cohort_id: fields.cohort_id });
        case "bookmark_entities":
          return stripUndefined({ command: "pin", entities: fields.entities });
        default:
          return stripUndefined({ command: op ?? "unknown", ...fields });
      }
    }

    default:
      return stripUndefined({ command, ...fields });
  }
}

// ---------------------------------------------------------------------------
// Internal command resolution (for output compaction)
// ---------------------------------------------------------------------------

function resolveInternalCommand(command: string, op?: string): string {
  switch (command) {
    case "cohort":
      return COHORT_OP_MAP[op ?? "rows"] ?? "rows";
    case "analyze":
      return op === "correlation" ? "correlation" : "analytics";
    case "workspace": {
      const WORKSPACE_CMD: Record<string, string> = {
        select_cohort: "set_cohort", memo: "remember",
        export: "export", bookmark_entities: "pin",
      };
      return WORKSPACE_CMD[op ?? ""] ?? op ?? "unknown";
    }
    default:
      return command;
  }
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

const DESCRIPTION = `Execute post-annotation analyses on cohort data and explore the biomedical knowledge graph.

COHORT (command:"cohort", op:...)
  rows     — read rows with optional filters/sort/select
  groupby  — aggregate by column
  derive   — create filtered sub-cohort
  rank     — multi-criteria prioritization
  score    — weighted composite score

ANALYZE (command:"analyze", op:...)
  correlation        — bivariate correlation (x, y)
  regression         — linear/logistic/elastic_net (method, features, target)
  feature_importance — variable importance ranking
  multiple_testing   — p-value correction (BH/Bonferroni/Holm)
  bootstrap_ci       — bootstrap confidence intervals
  permutation_test   — permutation-based hypothesis test
  pca                — principal component analysis
  cluster            — k-means or hierarchical clustering
  prs_association    — PRS to phenotype association (uses regression internally)

GRAPH — explore, traverse, query (same modes as before)
  explore (mode: neighbors|compare|enrich|similar|context|aggregate)
  traverse (mode: chain|paths)
  query — structural pattern matching

WORKSPACE (command:"workspace", op:...)
  select_cohort      — set active cohort
  memo               — store analysis notes
  export             — export cohort data
  bookmark_entities  — pin entities for later reference

Column names are auto-corrected. Schema is auto-fetched before cohort commands.
SEED FORMATS: {type,id}, {label}, {from_artifact,field}, {from_cohort,top}
IMPORTANT: For fuzzy name seeds, use ONLY {label:"..."} without a type field.
TARGET INTENTS: diseases, drugs, pathways, variants, phenotypes, tissues, genes, proteins, compounds, protein_domains`;

export function createAgentRunTool(getContext: () => RunContext) {
  return tool({
    description: DESCRIPTION,
    inputSchema: agentInputSchema,
    execute: async (cmd) => {
      const ctx = getContext();
      const internal = transformAgentInputToRunInput(cmd);
      return executeRun(internal, ctx);
    },
    toModelOutput: async (opts: { toolCallId: string; input: unknown; output: unknown }) => {
      const input = opts.input as AgentInput;
      const result = opts.output as RunResult;
      if (
        result.status === "error" ||
        result.status === "needs_user" ||
        result.status === "need_clarification" ||
        result.status === "empty" ||
        result.data?.error
      ) {
        return { type: "json" as const, value: result as unknown as null };
      }
      const internalCmd = resolveInternalCommand(input.command, input.op);
      return compactRunForModel(internalCmd, result);
    },
  });
}
