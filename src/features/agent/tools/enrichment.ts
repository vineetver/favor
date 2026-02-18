import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import type { CompressedEnrichment } from "../types";

export const runEnrichment = tool({
  description:
    "Run enrichment analysis on a gene list. Tests whether the genes are enriched for specific terms (pathways, diseases, phenotypes, GO terms). Requires gene IDs in Ensembl format — use searchEntities first to resolve gene names.",
  inputSchema: z.object({
    genes: z
      .array(
        z.object({
          type: z.literal("Gene"),
          id: z.string().describe("Ensembl gene ID (ENSG...)"),
        }),
      )
      .min(3)
      .describe("Gene list (3+ Ensembl IDs required)"),
    targetType: z
      .string()
      .describe("Target entity type for enrichment (e.g., 'Pathway', 'Disease', 'GOTerm')"),
    edgeType: z
      .string()
      .describe("Edge type connecting genes to targets (e.g., 'PARTICIPATES_IN', 'ASSOCIATED_WITH_DISEASE')"),
    pValueCutoff: z
      .number()
      .optional()
      .default(0.05)
      .describe("P-value cutoff for significance"),
    limit: z.number().optional().default(20).describe("Max enriched terms to return"),
  }),
  execute: async ({
    genes,
    targetType,
    edgeType,
    pValueCutoff,
    limit,
  }): Promise<CompressedEnrichment[]> => {
    const data = await agentFetch<{
      data: {
        inputSize: number;
        backgroundSize: number;
        targetType: string;
        edgeType: string;
        enriched: Array<{
          entity: { type: string; id: string; label: string };
          overlap: number;
          targetSize: number;
          pValue: number;
          adjustedPValue: number;
          foldEnrichment: number;
          overlappingEntities?: Array<{ type: string; id: string; label: string }>;
        }>;
      };
    }>("/graph/enrichment", {
      method: "POST",
      body: {
        inputSet: genes,
        targetType,
        edgeType,
        pValueCutoff: pValueCutoff ?? 0.05,
        limit: Math.min(limit ?? 20, 50),
      },
    });

    return (data.data?.enriched ?? []).slice(0, 10).map((e) => ({
      entity: e.entity,
      overlap: e.overlap,
      pValue: e.pValue,
      adjustedPValue: e.adjustedPValue,
      foldEnrichment: e.foldEnrichment,
    }));
  },
});
