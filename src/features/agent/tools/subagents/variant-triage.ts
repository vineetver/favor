import { tool, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { nanoModel } from "../../lib/models";
import { buildVariantTriagePrompt } from "../../lib/prompts/variant-triage-prompt";
import { createVariantTriagePrepareStep } from "../../lib/prepare-step-variant-triage";
import type { VariantTriageOutput, EvidenceRef, SubagentToolTrace } from "../../types";
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

function summarizeToolInput(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "analyzeCohort": {
      const op = args.operation as string | undefined;
      const cid = args.cohortId as string | undefined;
      return op && cid ? `${op} on ${cid}` : op ?? "analyze";
    }
    case "createCohort": {
      const variants = args.variants as unknown[] | undefined;
      return `${variants?.length ?? 0} variants`;
    }
    case "getCohortSchema": {
      const cid = args.cohortId as string | undefined;
      return cid ?? "schema";
    }
    case "lookupVariant": {
      const id = args.variantId as string | undefined;
      return id ?? "variant";
    }
    case "getGeneVariantStats": {
      const gene = args.geneSymbol as string | undefined;
      return gene ?? "gene";
    }
    case "getGwasAssociations": {
      const id = args.entityId as string | undefined;
      return id ?? "entity";
    }
    case "variantBatchSummary": {
      const variants = args.variants as unknown[] | undefined;
      return `${variants?.length ?? 0} variants`;
    }
    default:
      return Object.keys(args).slice(0, 2).join(", ") || "—";
  }
}

function summarizeToolOutput(name: string, out: Record<string, unknown>): string {
  if (out.error) return String(out.message ?? "error");
  switch (name) {
    case "analyzeCohort": {
      const rows = out.rows as unknown[] | undefined;
      const buckets = out.buckets as unknown[] | undefined;
      if (rows) return `${rows.length} rows`;
      if (buckets) return `${buckets.length} groups`;
      return "ok";
    }
    case "createCohort":
      return out.cohortId ? `cohort ${out.cohortId}` : "created";
    case "getCohortSchema":
      return "schema loaded";
    case "lookupVariant":
      return out.gene ? `gene: ${out.gene}` : "found";
    case "getGeneVariantStats":
      return out.totalVariants != null ? `${out.totalVariants} variants` : "stats";
    case "getGwasAssociations": {
      const assoc = out.topAssociations as unknown[] | undefined;
      return assoc ? `${assoc.length} associations` : "associations";
    }
    case "variantBatchSummary":
      return "summary";
    default:
      return "ok";
  }
}

/** Condense output for provenance display (cap array lengths to keep payload reasonable) */
function condenseOutput(out: unknown): unknown {
  if (!out || typeof out !== "object") return out;
  if (Array.isArray(out)) return out.slice(0, 10);
  const obj = out as Record<string, unknown>;
  const condensed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    condensed[key] = Array.isArray(val) ? val.slice(0, 10) : val;
  }
  return condensed;
}

function extractStructuredOutput(
  text: string,
  agentSteps: StepResult[],
  inputCohortId?: string,
): VariantTriageOutput {
  const topGenes: VariantTriageOutput["topGenes"] = [];
  const topVariants: VariantTriageOutput["topVariants"] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const toolTrace: SubagentToolTrace[] = [];
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
      const hasError = !out || !!out.error;

      // Build tool trace entry with full provenance data
      const args = (r.args ?? {}) as Record<string, unknown>;
      toolTrace.push({
        toolName: r.toolName,
        inputSummary: summarizeToolInput(r.toolName, args),
        status: hasError ? "error" : "completed",
        outputSummary: hasError
          ? String((out as Record<string, unknown>)?.message ?? "error")
          : summarizeToolOutput(r.toolName, out),
        input: Object.keys(args).length > 0 ? args : undefined,
        output: condenseOutput(r.output),
      });

      if (hasError) continue;

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
    toolTrace: toolTrace.length > 0 ? toolTrace : undefined,
    stepsUsed: agentSteps.length,
    toolCallsMade,
    toolsUsed: [...toolsUsed],
  };
}

// ---------------------------------------------------------------------------
// Specialist tool (exposed to supervisor)
// ---------------------------------------------------------------------------

const variantTriageInputSchema = z.object({
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
});

type VariantTriageInput = z.infer<typeof variantTriageInputSchema>;
type VariantTriageReturn = VariantTriageOutput | { error: boolean; message: string };

export const variantTriage = tool<VariantTriageInput, VariantTriageReturn>({
  description:
    "Delegate variant/cohort analysis to a specialist sub-agent. Handles: cohort ranking, grouping, filtering, multi-criteria prioritization, gene burden stats, GWAS associations, variant batch summaries. Returns structured topGenes and topVariants for bridging to knowledge graph. Use for any cohort or variant analysis workflow.",
  inputSchema: variantTriageInputSchema,
  execute: async ({
    task,
    cohortId,
    variants,
    geneSymbol,
    resolvedEntityIds,
  }): Promise<VariantTriageReturn> => {
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
  toModelOutput: ({ output }) => {
    if (output && "error" in output && (output as { error: boolean }).error) {
      return { type: "text" as const, value: JSON.stringify(output) };
    }
    const o = output as VariantTriageOutput;
    // If the sub-agent produced a summary, use it
    if (o.summary) {
      return { type: "text" as const, value: o.summary };
    }
    // Fallback: serialize structured data so supervisor can still synthesize
    const fallback: Record<string, unknown> = {};
    if (o.topGenes?.length) fallback.topGenes = o.topGenes;
    if (o.topVariants?.length) fallback.topVariants = o.topVariants;
    if (o.cohortId) fallback.cohortId = o.cohortId;
    if (o.toolTrace?.length) {
      fallback.toolResults = o.toolTrace
        .filter((t) => t.status === "completed")
        .map((t) => ({ tool: t.toolName, input: t.inputSummary, output: t.outputSummary }));
    }
    return {
      type: "text" as const,
      value: Object.keys(fallback).length > 0
        ? JSON.stringify(fallback)
        : "No results found.",
    };
  },
});
