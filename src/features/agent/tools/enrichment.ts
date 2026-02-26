import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const runEnrichment = tool({
  description:
    `Run enrichment analysis on an entity set. Tests whether the input entities are over-represented in specific target terms (pathways, diseases, phenotypes, GO terms).
USAGE: Pass 3+ entities of the same type, a targetType, and the edgeType connecting them.
EXAMPLES:
  runEnrichment({ genes: [{type:"Gene",id:"ENSG..."},...], targetType: "Pathway", edgeType: "GENE_PARTICIPATES_IN_PATHWAY" })
  runEnrichment({ genes: [{type:"Gene",id:"ENSG..."},...], targetType: "GOTerm", edgeType: "GENE_ANNOTATED_WITH_GO_TERM" })
Returns enriched terms with p-values, fold enrichment, and which input entities overlap each term.`,
  inputSchema: z.object({
    genes: z
      .array(
        z.object({
          type: z.string().describe("Entity type (usually 'Gene')"),
          id: z.string().describe("Entity ID (e.g., 'ENSG00000012048')"),
        }),
      )
      .min(3)
      .describe("Input entity set (3+ required, all same type)"),
    targetType: z
      .string()
      .describe("Target entity type (e.g., 'Pathway', 'Disease', 'GOTerm', 'Phenotype')"),
    edgeType: z
      .string()
      .describe("Edge type connecting input to target (e.g., 'GENE_PARTICIPATES_IN_PATHWAY', 'GENE_ASSOCIATED_WITH_DISEASE', 'GENE_ANNOTATED_WITH_GO_TERM')"),
    pValueCutoff: z
      .number()
      .optional()
      .default(0.05)
      .describe("Adjusted p-value cutoff (default 0.05)"),
    limit: z.number().optional().default(20).describe("Max enriched terms to return (default 20)"),
  }),
  execute: async ({
    genes,
    targetType,
    edgeType,
    pValueCutoff,
    limit,
  }) => {
    try {
      const data = await agentFetch<{
        data: {
          textSummary?: string;
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

      const enriched = (data.data?.enriched ?? []).slice(0, 20).map((e) => ({
        entity: e.entity,
        overlap: e.overlap,
        pValue: e.pValue,
        adjustedPValue: e.adjustedPValue,
        foldEnrichment: e.foldEnrichment,
        overlappingGenes: e.overlappingEntities?.map((oe) => oe.label) ?? [],
      }));

      if (enriched.length === 0) {
        return {
          error: true as const,
          message: `No significant enrichment found (p < ${pValueCutoff ?? 0.05})`,
          hint: "Try a higher p-value cutoff, different target type, or more genes.",
        };
      }

      return {
        textSummary: data.data.textSummary,
        inputSize: data.data.inputSize,
        backgroundSize: data.data.backgroundSize,
        enriched,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
