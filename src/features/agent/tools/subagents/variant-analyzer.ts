import { tool, generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
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

RULES:
- For 2+ variants, use createCohort (up to 5,000) or variantBatchSummary (up to 200 for quick summaries).
- Never loop lookupVariant — use cohort tools for batches.
- Use analyzeCohort for aggregation (aggregate), ranking (topk), and filtering (derive).
- Use getGeneVariantStats for pre-aggregated gene-level variant statistics.
- Use getGwasAssociations for GWAS trait associations.
- Use searchEntities to resolve entity names discovered during analysis.
- If unsure which edge type connects two entity types, call getGraphSchema(nodeType) first.
- Chain tools: create cohort → analyze → summarize findings.
- When done, write a clear summary with key findings.

SCORE COLUMNS for topk/derive: cadd_phred, revel, alpha_missense, sift_val, polyphen_val, spliceai_ds_max, gerp_rs, gnomad_af, gnomad_exome_af
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
          model: openai("gpt-4o"),
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
