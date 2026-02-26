import { tool, generateText, stepCountIs } from "ai";
import { z } from "zod";
import { nanoModel } from "../../lib/models";
import type { SubagentOutput } from "../../types";
import { searchEntities } from "../search-entities";
import { lookupVariant } from "../lookup-variant";
import { getGeneVariantStats } from "../gene-variant-stats";
import { getGwasAssociations } from "../gwas-lookup";
import { createCohort } from "../cohort-create";
import { analyzeCohort } from "../cohort-analyze";
import { variantBatchSummary } from "../variant-batch-summary";
import { getGraphSchema } from "../graph-schema";

const VARIANT_ANALYZER_PROMPT = `You are a focused variant/cohort analysis sub-agent for the FAVOR platform.

Your job: Given a task (and optionally a cohortId, variants, or gene), perform multi-step variant analysis and cohort workflows.

CRITICAL — COHORT-FIRST RULE:
Cohorts are NOT graph entities. NEVER call searchEntities or getEntityContext with a cohort ID — it will fail.
When a cohortId is provided, use cohort tools DIRECTLY. Cohorts can have 5,000+ variants — cohort tools (analyzeCohort, variantBatchSummary) are optimized for this scale. Do NOT:
- Call searchEntities with a cohort ID or score column name fragments
- Loop lookupVariant on individual variants
- Call getEntityContext per-variant
Instead: analyzeCohort(rows) for ranking/querying, analyzeCohort(groupby) for grouping, analyzeCohort(derive) for filtering, analyzeCohort(prioritize) for multi-criteria ranking, analyzeCohort(compute) for composite scores, analyzeCohort(correlation) for Pearson.
Only use searchEntities AFTER cohort analysis to resolve gene names discovered in results for KG bridging.

⚠ APC SCORE DISAMBIGUATION: "apc_*" score columns (apc_protein_function, apc_conservation, apc_epigenetics, etc.) are **Annotation Principal Component** scores — FAVOR-specific composite annotations. They are NOT the APC gene. NEVER search for "APC" as a gene when the task mentions apc_* scores. Pass them as sort column: analyzeCohort(rows, sort="apc_protein_function", desc=true).

RULES:
- For 2+ variants without a cohortId, use createCohort (up to 50,000) or variantBatchSummary (up to 200 for quick summaries).
- Never loop lookupVariant — use cohort tools for batches.
- Use analyzeCohort for querying (rows), grouping (groupby), filtering (derive), multi-criteria ranking (prioritize), composite scores (compute), and correlation.
- Use getGeneVariantStats for pre-aggregated gene-level variant statistics (only after identifying top genes from cohort analysis).
- Use getGwasAssociations for GWAS trait associations.
- Use searchEntities ONLY to resolve entity names discovered during analysis — not to search for terms from score column names.
- Chain tools: analyzeCohort(rows/groupby) → identify top genes → getGeneVariantStats or searchEntities for KG bridging.
- When done, write a clear summary with key findings.

SCORE COLUMNS for sort/prioritize/compute/derive: cadd_phred, revel, alpha_missense, sift_val, polyphen_val, spliceai_ds_max, gerp_rs, gnomad_af, gnomad_exome_af, apc_protein_function, apc_conservation, apc_epigenetics, apc_proximity_to_coding, apc_local_nucleotide_diversity, apc_mutation_density, apc_transcription_factor, apc_mappability, apc_micro_rna
CATEGORICAL FILTERS for derive: chromosome, gene, consequence, clinical_significance
NUMERIC FILTERS for derive: score_above, score_below (with field + threshold)`;

const VARIANT_TOOLS = {
  searchEntities,
  lookupVariant,
  getGeneVariantStats,
  getGwasAssociations,
  createCohort,
  analyzeCohort,
  variantBatchSummary,
  getGraphSchema,
};

const SUBAGENT_TIMEOUT = 90_000; // 90s

export const variantAnalyzer = tool({
  description:
    "Delegate complex variant/cohort analysis workflows to a focused sub-agent. Use for multi-step cohort creation + filtering + ranking + bridging workflows. Do NOT use for single variant lookup or simple cohort aggregate.",
  inputSchema: z.object({
    task: z
      .string()
      .describe("Natural language description of the analysis task"),
    cohortId: z
      .string()
      .optional()
      .describe("Existing cohort ID to analyze (if already created)"),
    variants: z
      .array(z.string())
      .optional()
      .describe("Variant identifiers to analyze (rsIDs or VCF notation)"),
    geneSymbol: z
      .string()
      .optional()
      .describe("Gene symbol for gene-focused variant analysis"),
  }),
  execute: async ({
    task,
    cohortId,
    variants,
    geneSymbol,
  }): Promise<SubagentOutput | { error: boolean; message: string }> => {
    const contextParts = [`Task: ${task}`];
    if (cohortId) contextParts.push(`Existing cohort: ${cohortId}`);
    if (variants?.length)
      contextParts.push(`Variants: ${JSON.stringify(variants)}`);
    if (geneSymbol) contextParts.push(`Gene: ${geneSymbol}`);

    try {
      const result = await Promise.race([
        generateText({
          model: nanoModel,
          system: VARIANT_ANALYZER_PROMPT,
          prompt: contextParts.join("\n"),
          tools: VARIANT_TOOLS,
          stopWhen: stepCountIs(10),
          maxOutputTokens: 4000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Subagent timeout")),
            SUBAGENT_TIMEOUT,
          ),
        ),
      ]);

      return {
        summary: result.text,
        stepsUsed: result.steps.length,
        toolCallsMade: result.steps.reduce(
          (sum, step) => sum + step.toolCalls.length,
          0,
        ),
        toolsUsed: [
          ...new Set(
            result.steps.flatMap((s) =>
              s.toolCalls.map((tc) => tc.toolName),
            ),
          ),
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown subagent error";
      return {
        error: true,
        message: `Variant analyzer failed: ${message}`,
      };
    }
  },
});
