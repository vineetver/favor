import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const variantBatchSummary = tool({
  description:
    "Get an LLM-optimized summary for a batch of variants (up to 200). Quick analysis without creating a persistent cohort. For larger lists or follow-up analysis, use createCohort instead.",
  inputSchema: z.object({
    variants: z
      .array(z.string())
      .min(1)
      .max(200)
      .describe("Variant identifiers (rsIDs or VCF notation)"),
    highlightLimit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of notable variants to highlight (max 50)"),
  }),
  execute: async ({ variants, highlightLimit }) => {
    try {
      const result = await agentFetch<{
        textSummary: string;
        resolution: {
          total: number;
          found: number;
          notFound: number;
          ambiguous: number;
          errors: number;
        };
        byGene?: Array<{ geneSymbol: string; count: number; pathogenic?: number; functionalImpact?: number }>;
        byConsequence?: Array<{ category: string; count: number }>;
        byClinicalSignificance?: Array<{ category: string; count: number }>;
        byFrequency?: Array<{ category: string; count: number }>;
        highlights?: Array<{
          rsid?: string;
          vcf: string;
          gene?: string;
          consequence?: string;
          clinicalSignificance?: string;
          caddPhred?: number;
          gnomadAf?: number;
        }>;
      }>("/variants/batch/summary", {
        method: "POST",
        body: {
          references: variants,
          highlight_limit: highlightLimit ?? 10,
        },
        timeout: 45_000,
      });

      return result;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
