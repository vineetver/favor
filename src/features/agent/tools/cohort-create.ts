import { tool } from "ai";
import { z } from "zod";
import {
  cohortFetch,
  AgentToolError,
  pollCohortUntilReady,
} from "../lib/api-client";
import type { CompressedCohort } from "../types";

export const createCohort = tool({
  description:
    "Create a cohort from a list of variant identifiers (vid:123, rsIDs, or VCF notation). Server resolves, annotates, and returns a summary. Use this when a user provides 2+ variants. Returns cohortId for subsequent analyzeCohort calls.",
  inputSchema: z.object({
    variants: z
      .array(z.string())
      .min(1)
      .max(50000)
      .describe("List of variant identifiers (vid:123, rsIDs like rs7412, or VCF like 19-44908684-T-C)"),
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
      const statusResult = await pollCohortUntilReady(cohortId);

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

      // Step 3: Get schema for row_count
      const schema = await cohortFetch<{
        text_summary?: string;
        row_count?: number;
      }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, { timeout: 30_000 });

      const variantCount = schema.row_count ?? statusResult.progress?.found ?? 0;

      return {
        cohortId,
        variantCount,
        resolution: {
          total: statusResult.progress?.rows_resolved ?? variants.length,
          resolved: statusResult.progress?.found ?? variantCount,
          notFound: statusResult.progress?.not_found ?? 0,
        },
        summary: schema.text_summary ?? `Cohort created with ${variantCount} variants.`,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
