import { tool } from "ai";
import { z } from "zod";
import {
  cohortFetch,
  AgentToolError,
  pollJobUntilDone,
  cohortFromJob,
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

      // Step 1: POST /cohorts → { job_id, state, created_at }
      const submitResult = await cohortFetch<{
        job_id: string;
        state: string;
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

      const jobId = submitResult.job_id;
      if (!jobId) {
        throw new AgentToolError(
          500,
          `POST /cohorts response missing job_id: ${JSON.stringify(submitResult).slice(0, 200)}`,
          "Unexpected response format from cohort creation endpoint.",
        );
      }

      // Step 2: Poll until terminal
      const job = await pollJobUntilDone(jobId, "default-tenant");

      if (job.state === "FAILED") {
        return {
          error: true,
          message: job.error_message,
          hint: `Error code: ${job.error_code}. ${job.retryable ? "This error is retryable." : "This error is not retryable."}`,
        };
      }

      if (job.state !== "COMPLETED") {
        return {
          error: true,
          message: `Job ended in unexpected state: ${job.state}`,
        };
      }

      // Step 3: Materialize cohort from completed job
      const result = await cohortFromJob(jobId, "default-tenant");

      const summaryParts: string[] = [];

      if (result.summary?.text_summary) {
        summaryParts.push(result.summary.text_summary);
      }

      if (result.summary?.by_gene?.length) {
        summaryParts.push(
          `Top genes: ${result.summary.by_gene
            .slice(0, 5)
            .map((g) => `${g.geneSymbol} (${g.count} variants${g.pathogenic ? `, ${g.pathogenic} pathogenic` : ""})`)
            .join(", ")}`,
        );
      }

      if (result.summary?.highlights?.length) {
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
        summary: summaryParts.join("\n") || `Cohort created with ${result.vid_count} variants.`,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
