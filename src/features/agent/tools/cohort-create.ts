import { tool } from "ai";
import { z } from "zod";
import {
  cohortFetch,
  AgentToolError,
  pollCohortUntilReady,
  getCohortSummaryAgent,
} from "../lib/api-client";
import type { CompressedCohort } from "../types";

export const createCohort = tool({
  description:
    "Create a cohort from a list of variant identifiers (rsIDs or VCF notation). Server resolves, annotates, and returns a summary with gene breakdown and highlights. Use this when a user provides 2+ variants. Returns cohortId for subsequent analyzeCohort calls.",
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
  execute: async ({ variants, label }): Promise<CompressedCohort | { error: boolean; message: string; hint?: string }> => {
    try {
      const idempotencyKey = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cohortLabel = label ?? `Agent cohort ${new Date().toISOString().slice(0, 10)}`;

      // Step 1: POST /cohorts → { id, status, created_at }
      const submitResult = await cohortFetch<{
        id: string;
        status: string;
        created_at: string;
      }>("/cohorts", {
        method: "POST",
        body: {
          references: variants,
          label: cohortLabel,
          idempotency_key: idempotencyKey,
        },
        timeout: 60_000,
      });

      const cohortId = submitResult.id;
      if (!cohortId) {
        throw new AgentToolError(
          500,
          `POST /cohorts response missing id: ${JSON.stringify(submitResult).slice(0, 200)}`,
          "Unexpected response format from cohort creation endpoint.",
        );
      }

      // Step 2: Poll cohort status until terminal
      const statusResult = await pollCohortUntilReady(cohortId, "default-tenant");

      if (statusResult.status === "failed") {
        return {
          error: true,
          message: `Cohort processing failed (status: ${statusResult.status})`,
          hint: "The cohort failed during processing. Try again or check the variants.",
        };
      }

      if (statusResult.status !== "ready") {
        return {
          error: true,
          message: `Cohort ended in unexpected status: ${statusResult.status}`,
        };
      }

      // Step 3: Get cohort summary
      const summary = await getCohortSummaryAgent(cohortId, "default-tenant");

      const summaryParts: string[] = [];

      if (summary.text_summary) {
        summaryParts.push(summary.text_summary);
      }

      if (summary.by_gene?.length) {
        summaryParts.push(
          `Top genes: ${summary.by_gene
            .slice(0, 5)
            .map((g) => `${g.gene_symbol} (${g.count} variants${g.pathogenic ? `, ${g.pathogenic} pathogenic` : ""})`)
            .join(", ")}`,
        );
      }

      if (summary.highlights?.length) {
        summaryParts.push(
          `Notable variants: ${summary.highlights
            .slice(0, 5)
            .map((h) => {
              const parts = [h.rsid ?? h.vcf];
              if (h.gene) parts.push(h.gene);
              if (h.clinical_significance) parts.push(h.clinical_significance);
              if (h.cadd_phred != null) parts.push(`CADD=${h.cadd_phred}`);
              return parts.join(" ");
            })
            .join("; ")}`,
        );
      }

      return {
        cohortId,
        variantCount: summary.vid_count,
        resolution: {
          total: statusResult.progress?.rows_resolved ?? variants.length,
          resolved: statusResult.progress?.found ?? summary.vid_count,
          notFound: statusResult.progress?.not_found ?? 0,
        },
        summary: summaryParts.join("\n") || `Cohort created with ${summary.vid_count} variants.`,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
