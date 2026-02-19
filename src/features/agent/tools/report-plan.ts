import { tool } from "ai";
import { z } from "zod";
import type { QueryType, PlanItem, ReportPlanOutput } from "../types";

/**
 * Lightweight planning tool the model calls at step 0-1.
 * No backend call — pure pass-through. The output is used by:
 * 1) prepareStep to route to a focused tool set
 * 2) PlanRenderer in the UI to show a live task checklist
 */
export const reportPlan = tool({
  description:
    "REQUIRED at step 0-1. Report your analysis plan and classify the query type. Call this in parallel with searchEntities + recallMemories. The plan becomes a visible task checklist in the UI and controls which tools are available in later steps.",
  inputSchema: z.object({
    queryType: z.enum([
      "entity_lookup",
      "variant_analysis",
      "graph_exploration",
      "cohort_analysis",
      "comparison",
      "connection",
      "drug_discovery",
      "general",
    ] as const satisfies readonly QueryType[]),
    plan: z
      .array(
        z.object({
          id: z.string().describe("Short step ID (e.g. 'resolve', 'get_stats')"),
          label: z.string().describe("Human-readable step label (e.g. 'Look up variant details')"),
          tools: z
            .array(z.string())
            .describe("Expected tool names for this step"),
        }),
      )
      .min(1)
      .max(8)
      .describe("Ordered list of plan steps"),
  }),
  execute: async (input): Promise<ReportPlanOutput> => input,
});
