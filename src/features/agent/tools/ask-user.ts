/**
 * AskUser tool — clarify ambiguous intent.
 * Same pattern as Claude Code's AskUserQuestion.
 */

import { tool } from "ai";
import { z } from "zod";

export const askUserTool = tool({
  description: `Clarify ambiguity with the user:
- Multiple matching entities (e.g. "cancer" → many diseases)
- Unclear target column for analytics
- Multiple valid analysis approaches
Response appears in the next turn.`,
  inputSchema: z.object({
    question: z.string().describe("The question to ask the user"),
    options: z
      .array(z.string())
      .optional()
      .describe("Optional list of choices (2-5 options)"),
    context: z
      .string()
      .optional()
      .describe("Brief context for why you're asking"),
  }),
  execute: async ({ question, options, context }) => {
    // This tool's output is rendered as a question in the UI.
    // The agent framework handles surfacing this to the user.
    return {
      type: "ask_user" as const,
      question,
      options: options ?? [],
      context,
    };
  },
});
