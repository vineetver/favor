import type { PrepareStepFunction } from "ai";
import { nanoModel, NANO_PROVIDER_OPTIONS } from "./models";
import { detectStuck, countToolCalls, getTrippedTools, isAllErrors, type StepData } from "./stuck-detection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VARIANT_TRIAGE_TOOLS = [
  "getCohortSchema",
  "analyzeCohort",
  "createCohort",
  "lookupVariant",
  "getGeneVariantStats",
  "getGwasAssociations",
  "variantBatchSummary",
  "runAnalytics",
] as const;

const TOOL_CALL_BUDGET = 20;
const MAX_STEPS = 10; // must match stepCountIs() in variant-triage.ts
const SYNTHESIS_RESERVE = 2; // reserve last N steps for synthesis

const NO_TEXT_INSTRUCTION =
  "\n\n[SYSTEM] Do NOT output explanatory text. ONLY call tools. When all analysis is done, write a summary with topGenes and topVariants.";

const SYNTHESIS_INSTRUCTION =
  "\n\n[SYSTEM] Write a summary of your analysis findings. Include topGenes (gene symbols, variant counts) and topVariants (variant IDs, gene, consequence, significance) extracted from your results.";

const RECOVERY_INSTRUCTION =
  "\n\n[SYSTEM] Your recent tool calls are not producing useful results. CHANGE YOUR APPROACH: try different operations, different columns, or different parameters.";

// ---------------------------------------------------------------------------
// Detect cohortId in the prompt
// ---------------------------------------------------------------------------

const COHORT_ID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function detectCohortIdInPrompt(steps: StepData[]): boolean {
  // Check if any tool call has a cohortId arg
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      if (tc.args && "cohortId" in tc.args) return true;
    }
  }
  return false;
}

function hasSchemaBeenFetched(steps: StepData[]): boolean {
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      if (tc.toolName === "getCohortSchema") return true;
    }
  }
  return false;
}

interface SchemaInfo {
  dataType?: string;
  numericCols?: string;
  categoricalCols?: string;
  identityCols?: string;
}

function getSchemaInfo(steps: StepData[]): SchemaInfo | null {
  for (const step of steps) {
    for (const r of step.toolResults ?? []) {
      if (r.toolName === "getCohortSchema") {
        const out = r.output as Record<string, unknown>;
        if (out?.columns) {
          const cols = out.columns as {
            numeric?: string[];
            categorical?: string[];
            identity?: string[];
            // Legacy compat
            score?: string[];
          };
          return {
            dataType: out.dataType as string | undefined,
            numericCols: (cols.numeric ?? cols.score)?.join(", "),
            categoricalCols: cols.categorical?.join(", "),
            identityCols: cols.identity?.join(", "),
          };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// prepareStep factory for variantTriage specialist
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createVariantTriagePrepareStep(): PrepareStepFunction<any> {
  let recoveryAttempted = false;

  return ({ stepNumber, steps }) => {
    const stepsData = steps as StepData[];

    const synthesize = (extraSystem?: string) => ({
      activeTools: [] as string[],
      system: SYNTHESIS_INSTRUCTION + (extraSystem ?? ""),
    });

    // Reserve last steps for synthesis — the agent MUST write a summary
    // before stepCountIs() kills the loop
    if (stepNumber >= MAX_STEPS - SYNTHESIS_RESERVE) {
      return synthesize();
    }

    // Tool call budget
    if (countToolCalls(stepsData) >= TOOL_CALL_BUDGET) {
      return synthesize();
    }

    // Stuck detection
    const stuckReason = detectStuck(stepsData);
    if (stuckReason) {
      if (stuckReason === "all-errors") return synthesize();
      if (!recoveryAttempted) {
        recoveryAttempted = true;
        const tripped = getTrippedTools(stepsData);
        return {
          model: nanoModel,
          providerOptions: NANO_PROVIDER_OPTIONS,
          toolChoice: "required" as const,
          activeTools: [...VARIANT_TRIAGE_TOOLS].filter((t) => !tripped.has(t)),
          system: NO_TEXT_INSTRUCTION + RECOVERY_INSTRUCTION,
        };
      }
      return synthesize();
    }

    const tripped = getTrippedTools(stepsData);
    const hasCohort = detectCohortIdInPrompt(stepsData);

    // Step 0: Force getCohortSchema if cohortId detected
    if (stepNumber === 0 && hasCohort && !hasSchemaBeenFetched(stepsData)) {
      return {
        model: nanoModel,
        providerOptions: NANO_PROVIDER_OPTIONS,
        toolChoice: { type: "tool", toolName: "getCohortSchema" } as const,
        activeTools: ["getCohortSchema"],
        system: NO_TEXT_INSTRUCTION,
      };
    }

    // Inject schema columns as system hint if available
    const schema = getSchemaInfo(stepsData);
    let schemaHint = "";
    if (schema) {
      const parts: string[] = [];
      if (schema.dataType) parts.push(`Cohort type: ${schema.dataType}.`);
      if (schema.numericCols) parts.push(`Available numeric columns: ${schema.numericCols}.`);
      if (schema.categoricalCols) parts.push(`Available categorical columns: ${schema.categoricalCols}.`);
      if (schema.identityCols) parts.push(`Available identity columns: ${schema.identityCols}.`);
      if (parts.length > 0) {
        schemaHint = `\n\n[SYSTEM] ${parts.join(" ")} Use ONLY these column names.`;
      }
    }

    // Steps 1+: tool required, all tools available
    return {
      model: nanoModel,
      providerOptions: NANO_PROVIDER_OPTIONS,
      toolChoice: "required" as const,
      activeTools: [...VARIANT_TRIAGE_TOOLS].filter((t) => !tripped.has(t)),
      system: NO_TEXT_INSTRUCTION + schemaHint,
    };
  };
}
