import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import type { CompressedGwasAssociation } from "../types";

/**
 * API response shape for GET /gwas/{reference}.
 * Returns Page<GwasAssociation> with optional GwasMeta. JSON uses snake_case.
 */
interface GwasPage {
  data: GwasAssociation[];
  page_info: { count: number; has_more: boolean; total_count?: number };
  meta?: { unique_traits: number; unique_studies: number };
}

interface GwasAssociation {
  trait?: string;
  disease_trait?: string;
  pvalue_mlog?: number;
  effect_size?: string;
  study_accession?: string;
  mapped_gene?: string;
  rsid?: string;
}

export const getGwasAssociations = tool({
  description:
    "Look up GWAS Catalog associations for a variant. Returns traits, p-values, effect sizes, and study accessions. Use rsID (rs7412) or VCF notation.",
  inputSchema: z.object({
    variant: z.string().describe("Variant identifier (rsID or VCF notation)"),
    pvalueMlogMin: z
      .number()
      .optional()
      .describe("Minimum -log10(p-value) threshold (default: genome-wide significant ~7.3)"),
    traitContains: z
      .string()
      .optional()
      .describe("Filter traits containing this text"),
    limit: z.number().optional().default(50).describe("Max associations to return"),
  }),
  execute: async ({ variant, pvalueMlogMin, traitContains, limit }) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (pvalueMlogMin) params.set("pvalue_mlog_min", String(pvalueMlogMin));
    if (traitContains) params.set("trait_contains", traitContains);

    const data = await agentFetch<GwasPage>(
      `/gwas/${encodeURIComponent(variant)}?${params.toString()}`,
    );

    const associations = data.data ?? [];
    const total = associations.length;

    if (total === 0) {
      return "No GWAS associations found for this variant.";
    }

    // Sort by p-value (most significant first)
    associations.sort((a, b) => (b.pvalue_mlog ?? 0) - (a.pvalue_mlog ?? 0));

    const compress = (a: GwasAssociation): CompressedGwasAssociation => ({
      trait: a.disease_trait ?? a.trait ?? "Unknown trait",
      pValueMlog: a.pvalue_mlog ?? 0,
      effectSize: a.effect_size,
      studyAccession: a.study_accession,
    });

    // Tiered compression based on result count
    if (total <= 10) {
      return associations.map(compress);
    }

    // Larger set: return top results + summary
    const topCount = total <= 50 ? 10 : 5;
    const uniqueTraits = data.meta?.unique_traits ?? new Set(associations.map((a) => a.trait)).size;

    return {
      totalHits: data.page_info.total_count ?? total,
      uniqueTraits,
      topStudy: associations[0]?.study_accession,
      topAssociations: associations.slice(0, topCount).map(compress),
    };
  },
});
