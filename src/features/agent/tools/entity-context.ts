import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import { truncateSections } from "../lib/compress";

export const getEntityContext = tool({
  description:
    "Get detailed context for a specific entity (gene, disease, drug, etc.) including properties, key relationships, and summary. Use after searchEntities to get details about a resolved entity.",
  inputSchema: z.object({
    type: z.string().describe("Entity type (e.g., 'Gene', 'Disease', 'Drug')"),
    id: z.string().describe("Entity ID (e.g., 'ENSG00000012048', 'MONDO_0007254')"),
    depth: z
      .enum(["minimal", "standard", "detailed"])
      .optional()
      .default("minimal")
      .describe("Level of detail: 'minimal' for overview (default), 'standard' for more, 'detailed' for deep dives"),
  }),
  execute: async ({ type, id, depth }) => {
    try {
      const data = await agentFetch<{ data: unknown }>("/graph/context", {
        method: "POST",
        body: {
          entities: [{ type, id }],
          depth,
        },
      });

      const result = data.data;
      if (typeof result === "string") {
        return truncateSections(result, 2000);
      }
      return result;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
