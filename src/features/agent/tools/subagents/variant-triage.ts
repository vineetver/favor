import { tool, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { nanoModel } from "../../lib/models";
import { buildVariantTriagePrompt } from "../../lib/prompts/variant-triage-prompt";
import { createVariantTriagePrepareStep } from "../../lib/prepare-step-variant-triage";
import type { VariantTriageOutput, EvidenceRef } from "../../types";
import { getCohortSchema } from "../cohort-schema";
import { analyzeCohort } from "../cohort-analyze";
import { createCohort } from "../cohort-create";
import { lookupVariant } from "../lookup-variant";
import { getGeneVariantStats } from "../gene-variant-stats";
import { getGwasAssociations } from "../gwas-lookup";
import { variantBatchSummary } from "../variant-batch-summary";

// ---------------------------------------------------------------------------
// Specialist tools (isolated universe — no graph tools)
// ---------------------------------------------------------------------------

const VARIANT_TRIAGE_TOOLS = {
  getCohortSchema,
  analyzeCohort,
  createCohort,
  lookupVariant,
  getGeneVariantStats,
  getGwasAssociations,
  variantBatchSummary,
};

const SUBAGENT_TIMEOUT = 90_000; // 90s

// ---------------------------------------------------------------------------
// Structured output extraction
// ---------------------------------------------------------------------------

interface ToolResult {
  toolName: string;
  output: unknown;
  args?: Record<string, unknown>;
}

interface StepResult {
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
  toolResults: ToolResult[];
}

function extractStructuredOutput(
  text: string,
  agentSteps: StepResult[],
  inputCohortId?: string,
): VariantTriageOutput {
  const topGenes: VariantTriageOutput["topGenes"] = [];
  const topVariants: VariantTriageOutput["topVariants"] = [];
  const evidenceRefs: EvidenceRef[] = [];
  let derivedCohortId: string | undefined;
  const toolsUsed = new Set<string>();
  let toolCallsMade = 0;

  for (const step of agentSteps) {
    for (const tc of step.toolCalls) {
      toolsUsed.add(tc.toolName);
      toolCallsMade++;
    }

    for (const r of step.toolResults) {
      const out = r.output as Record<string, unknown>;
      if (!out || out.error) continue;

      // Collect evidence refs
      evidenceRefs.push({
        source: r.toolName,
        endpoint: r.toolName,
        query: (r.args ?? {}) as Record<string, unknown>,
      });

      // Extract topGenes from groupby results
      if (r.toolName === "analyzeCohort" && out.buckets && Array.isArray(out.buckets)) {
        const buckets = out.buckets as Array<Record<string, unknown>>;
        for (const b of buckets.slice(0, 10)) {
          if (b.gene || b.key) {
            topGenes.push({
              symbol: (b.gene ?? b.key) as string,
              variantCount: (b.count ?? b.variant_count) as number | undefined,
            });
          }
        }
      }

      // Extract topVariants from rows results
      if (r.toolName === "analyzeCohort" && out.rows && Array.isArray(out.rows)) {
        const rows = out.rows as Array<Record<string, unknown>>;
        for (const row of rows.slice(0, 10)) {
          topVariants.push({
            id: (row.variant_vcf ?? row.rsid ?? "unknown") as string,
            gene: row.gene as string | undefined,
            consequence: row.consequence as string | undefined,
            significance: row.clinical_significance as string | undefined,
          });
        }
      }

      // Extract derived cohort IDs
      if (r.toolName === "analyzeCohort" && out.derivedCohortId) {
        derivedCohortId = out.derivedCohortId as string;
      }

      // Extract from createCohort
      if (r.toolName === "createCohort" && out.cohortId) {
        // The newly created cohort
        if (!inputCohortId) {
          // This was a fresh cohort creation
        }
      }
    }
  }

  return {
    summary: text,
    topGenes: topGenes.length > 0 ? topGenes : undefined,
    topVariants: topVariants.length > 0 ? topVariants : undefined,
    cohortId: inputCohortId,
    derivedCohortId,
    evidenceRefs,
    stepsUsed: agentSteps.length,
    toolCallsMade,
    toolsUsed: [...toolsUsed],
  };
}

// ---------------------------------------------------------------------------
// Specialist tool (exposed to supervisor)
// ---------------------------------------------------------------------------

export const variantTriage = tool({
  description:
    "Delegate variant/cohort analysis to a specialist sub-agent. Handles: cohort ranking, grouping, filtering, multi-criteria prioritization, gene burden stats, GWAS associations, variant batch summaries. Returns structured topGenes and topVariants for bridging to knowledge graph. Use for any cohort or variant analysis workflow.",
  inputSchema: z.object({
    task: z
      .string()
      .describe("Natural language description of the analysis task"),
    cohortId: z
      .string()
      .optional()
      .describe("Existing cohort ID to analyze"),
    variants: z
      .array(z.string())
      .optional()
      .describe("Variant identifiers to analyze (rsIDs or VCF notation)"),
    geneSymbol: z
      .string()
      .optional()
      .describe("Gene symbol for gene-focused analysis"),
    resolvedEntityIds: z
      .array(z.string())
      .optional()
      .describe("Pre-resolved entity IDs from searchEntities"),
  }),
  execute: async ({
    task,
    cohortId,
    variants,
    geneSymbol,
    resolvedEntityIds,
  }): Promise<VariantTriageOutput | { error: boolean; message: string }> => {
    const contextParts = [`Task: ${task}`];
    if (cohortId) contextParts.push(`Existing cohort: ${cohortId}`);
    if (variants?.length) contextParts.push(`Variants: ${JSON.stringify(variants)}`);
    if (geneSymbol) contextParts.push(`Gene: ${geneSymbol}`);
    if (resolvedEntityIds?.length) contextParts.push(`Resolved entity IDs: ${resolvedEntityIds.join(", ")}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBAGENT_TIMEOUT);

    try {
      const agent = new ToolLoopAgent({
        model: nanoModel,
        instructions: buildVariantTriagePrompt(),
        tools: VARIANT_TRIAGE_TOOLS,
        stopWhen: stepCountIs(10),
        prepareStep: createVariantTriagePrepareStep(),
        maxOutputTokens: 4000,
      });

      const result = await agent.generate({
        prompt: contextParts.join("\n"),
        abortSignal: controller.signal,
      });

      return extractStructuredOutput(
        result.text,
        result.steps as unknown as StepResult[],
        cohortId,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown subagent error";
      return { error: true, message: `Variant triage failed: ${message}` };
    } finally {
      clearTimeout(timer);
    }
  },
});
