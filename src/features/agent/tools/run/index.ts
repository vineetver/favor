/**
 * Run tool — command router.
 * Dispatches RunCommand to the appropriate handler.
 */

import { z } from "zod";
import { tool } from "ai";
import { type RunCommand, type RunResult, type EntityRef } from "./types";
import { handleRows, handleGroupby, handleCorrelation, handleDerive, handlePrioritize, handleCompute } from "./handlers/cohort";
import { handleAnalytics, handleAnalyticsPoll, handleViz } from "./handlers/analytics";
import { handleExplore, handleTraverse, handleQuery } from "./handlers/graph";
import { handlePin, handleSetCohort, handleRemember, handleExport, handleCreateCohort } from "./handlers/workspace";
import { compactRunForModel } from "./compactify";

export type { RunCommand, RunResult, EntityRef } from "./types";
export { runCommandSchema } from "./types";

interface RunContext {
  activeCohortId?: string;
  sessionId?: string;
  resolvedEntities?: Record<string, EntityRef>;
}

type CommandHandler = (
  cmd: RunCommand,
  ctx: RunContext,
) => Promise<RunResult>;

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  // Cohort
  rows: (cmd, ctx) => handleRows(cmd as Extract<RunCommand, { command: "rows" }>, ctx.activeCohortId),
  groupby: (cmd, ctx) => handleGroupby(cmd as Extract<RunCommand, { command: "groupby" }>, ctx.activeCohortId),
  correlation: (cmd, ctx) => handleCorrelation(cmd as Extract<RunCommand, { command: "correlation" }>, ctx.activeCohortId),
  derive: (cmd, ctx) => handleDerive(cmd as Extract<RunCommand, { command: "derive" }>, ctx.activeCohortId),
  prioritize: (cmd, ctx) => handlePrioritize(cmd as Extract<RunCommand, { command: "prioritize" }>, ctx.activeCohortId),
  compute: (cmd, ctx) => handleCompute(cmd as Extract<RunCommand, { command: "compute" }>, ctx.activeCohortId),

  // Analytics
  analytics: (cmd, ctx) => handleAnalytics(cmd as Extract<RunCommand, { command: "analytics" }>, ctx.activeCohortId),
  "analytics.poll": (cmd) => handleAnalyticsPoll(cmd as Extract<RunCommand, { command: "analytics.poll" }>),
  viz: (cmd) => handleViz(cmd as Extract<RunCommand, { command: "viz" }>),

  // Graph — 3 mode-dispatched primitives
  explore: (cmd, ctx) => handleExplore(cmd as Extract<RunCommand, { command: "explore" }>, ctx.resolvedEntities),
  traverse: (cmd, ctx) => handleTraverse(cmd as Extract<RunCommand, { command: "traverse" }>, ctx.resolvedEntities),
  query: (cmd, ctx) => handleQuery(cmd as Extract<RunCommand, { command: "query" }>, ctx.resolvedEntities),

  // Workspace
  pin: (cmd) => handlePin(cmd as Extract<RunCommand, { command: "pin" }>),
  set_cohort: (cmd) => handleSetCohort(cmd as Extract<RunCommand, { command: "set_cohort" }>),
  remember: (cmd, ctx) => handleRemember(cmd as Extract<RunCommand, { command: "remember" }>, ctx.sessionId),
  export: (cmd, ctx) => handleExport(cmd as Extract<RunCommand, { command: "export" }>, ctx.activeCohortId),
  create_cohort: (cmd) => handleCreateCohort(cmd as Extract<RunCommand, { command: "create_cohort" }>),
};

/**
 * Execute a Run command.
 */
export async function executeRun(
  command: RunCommand,
  ctx: RunContext,
): Promise<RunResult> {
  const handler = COMMAND_HANDLERS[command.command];
  if (!handler) {
    return {
      text_summary: `Unknown command: ${command.command}`,
      data: { error: true, message: `Unknown command: ${command.command}` },
      state_delta: {},
    };
  }
  return handler(command, ctx);
}

// ---------------------------------------------------------------------------
// Flat input schema for OpenAI compatibility
// OpenAI requires root schema type: "object" — z.discriminatedUnion produces
// oneOf at root which OpenAI rejects. Flatten all unions to plain objects.
// ---------------------------------------------------------------------------

const targetIntents = z.enum([
  "diseases", "drugs", "pathways", "variants",
  "phenotypes", "tissues", "genes", "proteins", "compounds",
]);

const flatSeedRef = z.object({
  type: z.string().optional().describe("Entity type (e.g. Gene, Disease) — for exact ref"),
  id: z.string().optional().describe("Entity ID — for exact ref"),
  label: z.string().optional().describe("Fuzzy label for search (e.g. 'BRCA1')"),
  from_artifact: z.number().optional().describe("Artifact ID to extract entities from"),
  field: z.string().optional().describe("Field within artifact to extract"),
  from_cohort: z.string().optional().describe("Cohort ID to extract top entities from"),
  top: z.number().optional().describe("Number of top entities from cohort"),
});

const flatCohortFilter = z.object({
  type: z.enum(["chromosome", "gene", "consequence", "clinical_significance", "score_above", "score_below"]),
  value: z.string().optional().describe("For chromosome filter"),
  values: z.array(z.string()).optional().describe("For gene/consequence/clinical_significance"),
  field: z.string().optional().describe("Column name for score_above/score_below"),
  threshold: z.number().optional().describe("Threshold for score_above/score_below"),
});

const flatTraverseStep = z.object({
  into: targetIntents.optional().describe("Target intent for navigation step"),
  enrich: targetIntents.optional().describe("Target for enrichment step"),
  top: z.number().optional(),
  sort: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  p_cutoff: z.number().optional(),
});

const flatAnalyticsTask = z.object({
  type: z.enum([
    "linear_regression", "logistic_regression", "elastic_net",
    "cox_regression", "pca", "kmeans", "hierarchical_clustering",
    "feature_importance", "bootstrap_ci", "permutation_test",
    "multiple_testing_correction", "gwas_qc", "score_model",
  ]),
  features: z.object({
    numeric: z.array(z.string()),
    categorical: z.array(z.string()).optional(),
    transforms: z.array(z.object({
      type: z.enum(["log1p", "standardize", "min_max_scale"]),
      field: z.string().optional(),
      fields: z.array(z.string()).optional(),
    })).optional(),
    missing: z.enum(["median", "mean", "drop"]).optional(),
  }).optional(),
  target: z.object({
    field: z.string(),
    positive_values: z.array(z.string()).optional().describe("For logistic regression binary target"),
  }).optional(),
  validation: z.object({
    split: z.enum(["holdout", "kfold"]),
    k: z.number().optional(),
    test_fraction: z.number().optional(),
    seed: z.number().optional(),
  }).optional(),
  regularization: z.object({
    penalty: z.enum(["l1", "l2", "elasticnet"]),
    l1_ratio: z.number().optional(),
    lambda: z.number().optional(),
  }).optional(),
  l1_ratio: z.number().optional(),
  lambda: z.number().optional(),
  time_column: z.string().optional(),
  event_column: z.string().optional(),
  n_components: z.number().optional(),
  k: z.number().optional(),
  max_iterations: z.number().optional(),
  seed: z.number().optional(),
  n_clusters: z.number().optional(),
  linkage: z.enum(["ward", "complete", "average", "single"]).optional(),
  method: z.string().optional(),
  n_repeats: z.number().optional(),
  statistic: z.object({ stat: z.string() }).optional().describe("Bootstrap CI: {stat: 'mean'|'median'}"),
  columns: z.array(z.string()).optional(),
  n_bootstrap: z.number().optional(),
  confidence: z.number().optional(),
  x_column: z.string().optional(),
  y_column: z.string().optional(),
  n_permutations: z.number().optional(),
  p_value_column: z.string().optional(),
  effect_size_column: z.string().optional(),
  se_column: z.string().optional(),
  model_run_id: z.string().optional(),
  output_column: z.string().optional(),
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

/**
 * Flat input schema (root type: "object").
 * All command fields merged as optional. The `command` enum discriminator
 * tells the model which fields apply. Handlers cast to the narrow type.
 */
const runInputSchema = z.object({
  command: z.enum([
    "rows", "groupby", "correlation", "derive", "prioritize", "compute",
    "analytics", "analytics.poll", "viz", "export", "create_cohort",
    "explore", "traverse", "query",
    "pin", "set_cohort", "remember",
  ]),

  // --- Cohort common ---
  cohort_id: z.string().optional().describe("Cohort ID (uses active cohort if omitted)"),

  // --- rows ---
  select: z.array(z.string()).optional().describe("Columns to return (rows)"),
  filters: z.array(flatCohortFilter).optional().describe("Cohort filters"),
  sort: z.string().optional().describe("Sort column (rows, explore)"),
  desc: z.boolean().optional().describe("Sort descending (rows)"),
  limit: z.number().optional().describe("Max results (default 10 for rows; only increase when user asks)"),
  offset: z.number().optional().describe("Pagination offset (rows)"),

  // --- groupby ---
  group_by: z.string().optional().describe("Column to group by"),
  metrics: z.array(z.string()).optional().describe("Aggregate metrics (groupby)"),
  bin_width: z.number().optional().describe("Numeric bin width (groupby)"),

  // --- correlation ---
  x: z.string().optional().describe("X column (correlation)"),
  y: z.string().optional().describe("Y column (correlation)"),

  // --- derive / create_cohort ---
  label: z.string().optional().describe("Label for derived cohort or created cohort"),

  // --- prioritize ---
  criteria: z.array(criterion).optional().describe("Ranking criteria [{column, desc?, weight?}]"),

  // --- compute ---
  weights: z.array(weight).optional().describe("Weighted score [{column, weight}]"),
  normalize: z.boolean().optional().describe("Normalize before scoring (compute)"),

  // --- analytics ---
  method: z.string().optional().describe("Analytics method name"),
  params: flatAnalyticsTask.optional().describe("Analytics task parameters"),

  // --- analytics.poll / viz ---
  run_id: z.string().optional().describe("Analytics run ID"),
  chart_id: z.string().optional().describe("Chart ID (viz)"),
  max_points: z.number().optional().describe("Max chart points (viz)"),

  // --- create_cohort ---
  references: z.array(z.string()).optional().describe("Variant references (rsIDs or chr-pos-ref-alt)"),

  // --- explore (mode-dispatched) ---
  mode: z.string().optional().describe("Sub-mode: explore(neighbors|compare|enrich|similar|context|aggregate), traverse(chain|paths)"),
  seeds: z.array(flatSeedRef).optional().describe("Seed entity refs (explore, query)"),
  into: z.array(targetIntents).optional().describe("Target intents (explore neighbors)"),
  depth: z.number().optional().describe("Traversal depth (explore neighbors)"),
  edge_type: z.string().optional().describe("Edge type (explore compare/aggregate)"),
  direction: z.enum(["in", "out"]).optional().describe("Edge direction (explore compare/aggregate)"),
  target: targetIntents.optional().describe("Target intent (explore enrich)"),
  p_cutoff: z.number().optional().describe("P-value cutoff (explore enrich)"),
  edge_types: z.array(z.string()).optional().describe("Edge types filter (explore similar)"),
  top_k: z.number().optional().describe("Top K similar entities (explore similar)"),
  sections: z.array(z.string()).optional().describe("Context sections (explore context)"),
  context_depth: z.enum(["minimal", "standard", "detailed"]).optional().describe("Context depth (explore context)"),
  metric: z.enum(["count", "avg", "sum", "min", "max"]).optional().describe("Aggregation metric (explore aggregate)"),
  score_field: z.string().optional().describe("Score field for aggregation (explore aggregate)"),

  // --- traverse (mode-dispatched) ---
  seed: flatSeedRef.optional().describe("Single seed ref (traverse chain)"),
  steps: z.array(flatTraverseStep).optional().describe("Traversal steps (traverse chain)"),
  from: z.string().optional().describe("Source entity 'Type:ID' (traverse paths)"),
  to: z.string().optional().describe("Target entity 'Type:ID' (traverse paths)"),
  max_hops: z.number().optional().describe("Max path hops (traverse paths)"),
  include_edge_detail: z.boolean().optional().describe("Enrich paths with edge details (traverse paths)"),

  // --- query ---
  description: z.string().optional().describe("Natural language pattern description (query)"),
  pattern: z.array(z.object({
    var: z.string(),
    type: z.string().optional(),
    edge: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })).optional().describe("Structural pattern (query)"),
  return_vars: z.array(z.string()).optional().describe("Variables to return (query)"),

  // --- pin ---
  entities: z.array(flatSeedRef).optional().describe("For pin: [{type, id, label}]"),

  // --- remember ---
  key: z.string().optional().describe("Memory key (remember)"),
  content: z.string().optional().describe("Memory content (remember)"),
  value: z.record(z.unknown()).optional().describe("Structured value (remember)"),
});

/**
 * Create the Run tool for the AI SDK.
 */
export function createRunTool(getContext: () => RunContext) {
  return tool({
    description: `Execute work: cohort queries, analytics, graph exploration, workspace management.

COHORT COMMANDS (require active cohort or cohort_id):
  rows, groupby, correlation, derive, prioritize, compute, analytics, analytics.poll, viz, export, create_cohort

GRAPH COMMANDS (3 mode-dispatched primitives):
  explore (mode: neighbors|compare|enrich|similar|context|aggregate)
    neighbors — { seeds, into: ["diseases","drugs"] }  (default mode)
    compare   — { mode:"compare", seeds:[...2+], edge_type? }
    enrich    — { mode:"enrich", seeds:[...3+], target:"pathways" }
    similar   — { mode:"similar", seeds:[{label:"TP53"}], top_k? }
    context   — { mode:"context", seeds, sections?, context_depth? }
    aggregate — { mode:"aggregate", seeds, edge_type, metric:"count" }
  traverse (mode: chain|paths)
    chain     — { seed, steps:[{into:"diseases"},{enrich:"pathways"}] }  (default mode)
    paths     — { mode:"paths", from:"Gene:ENSG...", to:"Disease:MONDO_..." }
  query — structural pattern matching
    { pattern:[{var:"a",type:"Gene"},{var:"b",type:"Disease"},{var:"e",edge:"GENE_ASSOCIATED_WITH_DISEASE",from:"a",to:"b"}], return_vars:["a","b"] }

WORKSPACE: pin, set_cohort, remember

SEED FORMATS: {type,id}, {label}, {from_artifact,field}, {from_cohort,top}
IMPORTANT: For fuzzy name seeds, use ONLY {label:"..."} without a type field. The resolver detects the type. Only use {type,id} for exact entity IDs.
TARGET INTENTS: diseases, drugs, pathways, variants, phenotypes, tissues, genes, proteins, compounds`,
    inputSchema: runInputSchema,
    execute: async (cmd) => {
      const ctx = getContext();
      const result = await executeRun(cmd as unknown as RunCommand, ctx);
      return result;
    },
    toModelOutput: async (opts: { toolCallId: string; input: unknown; output: unknown }) => {
      const cmd = opts.input as { command: string };
      const result = opts.output as RunResult;
      if (result.data?.error) {
        return { type: "json" as const, value: result as unknown as null };
      }
      return compactRunForModel(cmd.command, result);
    },
  });
}
