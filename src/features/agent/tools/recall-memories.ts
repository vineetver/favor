import { tool } from "ai";
import { z } from "zod";
import { searchMemories } from "../lib/agent-api";
import { AgentToolError } from "../lib/api-client";

export const recallMemories = tool({
  description:
    "Search across saved memories using semantic similarity. Use this to recall facts, user preferences, cohort info, or workflows from previous sessions. Call early in a conversation to check if you already know something relevant.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Natural language search query (e.g., 'BRCA1 cohort', 'user genome build preference', 'previous enrichment results')",
      ),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max memories to return (default 5, max 20)"),
  }),
  execute: async ({ query, limit }) => {
    if (!query.trim()) {
      return { error: true, message: "Empty search query" };
    }

    try {
      const memories = await searchMemories(
        query,
        Math.min(limit ?? 5, 20),
      );

      if (memories.length === 0) {
        return { recalled: [], message: "No relevant memories found." };
      }

      return {
        recalled: memories.map((m) => ({
          type: m.memory_type,
          scope: m.scope,
          content: m.content,
          value: m.value,
          confidence: m.confidence,
          updatedAt: m.updated_at,
        })),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
