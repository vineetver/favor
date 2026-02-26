import { tool } from "ai";
import { z } from "zod";
import { runPlanAgent } from "../lib/plan-agent";
import type { AgentPlan } from "../types";

/**
 * planQuery — supervisor calls this at step 0.
 * Internally delegates to PlanAgent (generateObject) for strict JSON output.
 * Replaces the old reportPlan tool where the supervisor LLM produced the plan.
 */
export const planQuery = tool({
  description:
    "REQUIRED at step 0. Analyze the user query and produce an execution plan. This tool classifies intent and decides which specialists to invoke. The plan becomes a visible task checklist in the UI.",
  inputSchema: z.object({
    userQuery: z.string().describe("The user's question/request to plan for"),
  }),
  execute: async ({ userQuery }): Promise<AgentPlan> => {
    return runPlanAgent(userQuery);
  },
});
