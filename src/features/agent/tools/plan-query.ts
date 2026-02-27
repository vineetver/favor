import { tool } from "ai";
import { z } from "zod";
import { runPlanAgent } from "../lib/plan-agent";
import type { AgentPlan, ConversationContext } from "../types";

/**
 * createPlanQueryTool — factory that creates a planQuery tool
 * with optional conversation context for follow-up awareness.
 */
export function createPlanQueryTool(context?: ConversationContext) {
  return tool({
    description:
      "REQUIRED at step 0. Analyze the user query and produce an execution plan. This tool classifies intent and decides which specialists to invoke. The plan becomes a visible task checklist in the UI.",
    inputSchema: z.object({
      userQuery: z.string().describe("The user's question/request to plan for"),
    }),
    execute: async ({ userQuery }): Promise<AgentPlan> => {
      return runPlanAgent(userQuery, context);
    },
  });
}

// Default singleton (used for type inference in tools/index.ts)
export const planQuery = createPlanQueryTool();
