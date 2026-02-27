import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

// Valid targetType → edgeType combos for enrichment
const TARGET_EDGE_MAP: Record<string, string> = {
  Pathway: "GENE_PARTICIPATES_IN_PATHWAY",
  Disease: "GENE_ASSOCIATED_WITH_DISEASE",
  GOTerm: "GENE_ANNOTATED_WITH_GO_TERM",
  Phenotype: "GENE_ASSOCIATED_WITH_PHENOTYPE",
};

export const runEnrichment = tool({
  description: `Statistical over-representation test: are the input genes enriched in specific pathways, diseases, GO terms, or phenotypes?
WHEN TO USE: "What pathways are these genes enriched in?", "Common diseases for this gene set?" — requires 3+ input genes.
WHEN NOT TO USE: Single entity neighbors → getRankedNeighbors. Fewer than 3 entities → not enough statistical power.
The edgeType MUST match targetType: Pathway→GENE_PARTICIPATES_IN_PATHWAY, Disease→GENE_ASSOCIATED_WITH_DISEASE, GOTerm→GENE_ANNOTATED_WITH_GO_TERM, Phenotype→GENE_ASSOCIATED_WITH_PHENOTYPE.`,
  inputSchema: z.object({
    genes: z
      .array(
        z.object({
          type: z.string().describe("Entity type (usually 'Gene')"),
          id: z.string().describe("Entity ID (e.g. 'ENSG00000012048')"),
        }),
      )
      .min(3)
      .describe("Input gene set (3+ required)"),
    targetType: z
      .enum(["Pathway", "Disease", "GOTerm", "Phenotype"])
      .describe("What to test enrichment against"),
    edgeType: z
      .enum([
        "GENE_PARTICIPATES_IN_PATHWAY",
        "GENE_ASSOCIATED_WITH_DISEASE",
        "GENE_ANNOTATED_WITH_GO_TERM",
        "GENE_ASSOCIATED_WITH_PHENOTYPE",
      ])
      .describe("Edge connecting genes to targets. MUST match targetType (see description)."),
    pValueCutoff: z
      .number()
      .optional()
      .default(0.05)
      .describe("Adjusted p-value cutoff (default 0.05)"),
    limit: z.number().optional().default(20).describe("Max enriched terms (default 20)"),
  }),
  execute: async ({
    genes,
    targetType,
    edgeType,
    pValueCutoff,
    limit,
  }) => {
    // Validate that edgeType matches targetType
    const expectedEdge = TARGET_EDGE_MAP[targetType];
    if (expectedEdge && edgeType !== expectedEdge) {
      return {
        error: true as const,
        message: `Edge type '${edgeType}' does not match target type '${targetType}'. Expected '${expectedEdge}'.`,
        hint: `For targetType='${targetType}', use edgeType='${expectedEdge}'.`,
      };
    }

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
          hint: "Try a higher p-value cutoff (e.g. 0.1), a different targetType, or more input genes.",
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
