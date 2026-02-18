import { tool } from "ai";
import { z } from "zod";
import { cohortFetch } from "../lib/api-client";
import type { CompressedCohort } from "../types";

export const createCohort = tool({
  description:
    "Create a cohort from a list of variant identifiers (rsIDs or VCF notation). The server resolves variants, annotates them, and returns a summary with gene breakdown and highlights. Use this when a user pastes or provides a list of variants.",
  inputSchema: z.object({
    variants: z
      .array(z.string())
      .min(1)
      .max(5000)
      .describe("List of variant identifiers (rsIDs like rs7412 or VCF like 19-44908684-T-C)"),
    label: z
      .string()
      .optional()
      .describe("Optional label for the cohort"),
  }),
  execute: async ({ variants, label }): Promise<CompressedCohort> => {
    const idempotencyKey = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Cohort API: snake_case top-level, camelCase for GeneBucket/VariantHighlight
    const result = await cohortFetch<{
      cohort_id: string;
      vid_count: number;
      resolution: {
        total: number;
        resolved: number;
        not_found: number;
        ambiguous: number;
        errors: number;
      };
      summary: {
        text_summary: string;
        cohort_id: string;
        vid_count: number;
        by_gene?: Array<{ geneSymbol: string; count: number; pathogenic: number; functionalImpact: number }>;
        by_consequence?: Array<{ category: string; count: number }>;
        by_clinical_significance?: Array<{ category: string; count: number }>;
        by_frequency?: Array<{ category: string; count: number }>;
        highlights?: Array<{
          rsid?: string;
          vcf: string;
          gene?: string;
          consequence?: string;
          clinicalSignificance?: string;
          caddPhred?: number;
          gnomadAf?: number;
        }>;
      };
    }>("/cohorts", {
      method: "POST",
      body: {
        references: variants,
        label: label ?? `Agent cohort ${new Date().toISOString().slice(0, 10)}`,
        idempotency_key: idempotencyKey,
      },
      timeout: 60_000,
    });

    // Build compressed summary for LLM
    const summaryParts = [result.summary.text_summary];

    if (result.summary.by_gene?.length) {
      summaryParts.push(
        `Top genes: ${result.summary.by_gene
          .slice(0, 5)
          .map((g) => `${g.geneSymbol} (${g.count} variants${g.pathogenic ? `, ${g.pathogenic} pathogenic` : ""})`)
          .join(", ")}`,
      );
    }

    if (result.summary.highlights?.length) {
      summaryParts.push(
        `Notable variants: ${result.summary.highlights
          .slice(0, 5)
          .map((h) => {
            const parts = [h.rsid ?? h.vcf];
            if (h.gene) parts.push(h.gene);
            if (h.clinicalSignificance) parts.push(h.clinicalSignificance);
            if (h.caddPhred != null) parts.push(`CADD=${h.caddPhred}`);
            return parts.join(" ");
          })
          .join("; ")}`,
      );
    }

    return {
      cohortId: result.cohort_id,
      variantCount: result.vid_count,
      resolution: {
        total: result.resolution.total,
        resolved: result.resolution.resolved,
        notFound: result.resolution.not_found,
      },
      summary: summaryParts.join("\n"),
    };
  },
});
