import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { CompressedGeneStats } from "../types";

interface GeneStatisticsResponse {
  ensemblGeneId: string;
  geneSymbol: string;
  chromosome: string;
  startPosition: number;
  endPosition: number;
  counts: Record<string, number>;
}

export const getGeneVariantStats = tool({
  description:
    "Get pre-aggregated variant statistics/ variant burden for a gene — total variants, ClinVar classifications, consequence types, frequency distribution, and pathogenicity score counts. Instant (pre-computed). Use gene symbol (BRCA1) or Ensembl ID (ENSG00000012048).",
  inputSchema: z.object({
    gene: z.string().describe("Gene symbol (BRCA1) or Ensembl ID (ENSG00000012048)"),
  }),
  execute: async ({ gene }): Promise<CompressedGeneStats | { error: boolean; message: string; hint?: string }> => {
    try {
      const data = await agentFetch<GeneStatisticsResponse>(
        `/statistics/gene/${encodeURIComponent(gene)}`,
      );

      const c = data.counts ?? {};
      return {
        gene: data.geneSymbol ?? gene,
        totalVariants: c.varTotal ?? 0,
        snvCount: c.varSnv ?? 0,
        indelCount: c.varIndel ?? 0,
        clinvar: {
          pathogenic: c.clinPathogenic ?? 0,
          likelyPathogenic: c.clinLikelyPathogenic ?? 0,
          benign: c.clinBenign ?? 0,
          likelyBenign: c.clinLikelyBenign ?? 0,
          vus: c.clinUncertain ?? 0,
          conflicting: c.clinConflicting ?? 0,
        },
        consequence: {
          lof: c.funcLof ?? 0,
          missense: c.funcMissense ?? 0,
          nonsense: c.funcNonsense ?? 0,
          frameshift: c.funcFrameshift ?? 0,
          inframe: c.funcInframe ?? 0,
          splice: c.locSplicing ?? 0,
          synonymous: c.funcSynonymous ?? 0,
        },
        location: {
          exonic: c.locExonic ?? 0,
          intronic: c.locIntronic ?? 0,
          utr: c.locUtr ?? 0,
          splicing: c.locSplicing ?? 0,
          regulatory: (c.regEnhancer ?? 0) + (c.regPromoter ?? 0),
        },
        frequency: {
          common: c.freqCommon ?? 0,
          lowFreq: c.freqLow ?? 0,
          rare: c.freqRare ?? 0,
          ultraRare: c.freqUltraRare ?? 0,
          singleton: c.freqSingleton ?? 0,
        },
        scores: {
          highCadd: c.predCaddPhred20 ?? 0,
          highRevel: c.predRevelPathogenic ?? 0,
          highAlphaMissense: c.predAlphamissensePathogenic ?? 0,
          splicingAffecting: c.predSpliceaiAffecting ?? 0,
          siftDeleterious: c.predSiftDeleterious ?? 0,
          polyphenDamaging: c.predPolyphenDamaging ?? 0,
        },
        actionable: c.scoreActionable ?? 0,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
