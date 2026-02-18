import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import { truncateSections } from "../lib/compress";

export const getEntityContext = tool({
  description:
    "Get detailed context for a specific entity (gene, disease, drug, etc.) including its properties, key relationships, and summary. Use after searchEntities to get details about a specific entity.",
  inputSchema: z.object({
    type: z.string().describe("Entity type (e.g., 'Gene', 'Disease', 'Drug')"),
    id: z.string().describe("Entity ID (e.g., 'ENSG00000012048', 'MONDO_0007254')"),
    depth: z
      .enum(["minimal", "standard", "detailed"])
      .optional()
      .default("standard")
      .describe("Level of detail: 'minimal' for overview, 'standard' for chat, 'detailed' for deep dives"),
  }),
  execute: async ({ type, id, depth }) => {
    const data = await agentFetch<{ data: unknown }>("/graph/context", {
      method: "POST",
      body: {
        entities: [{ type, id }],
        depth,
      },
    });

    // Server returns LLM-optimized response; truncate long sections
    const result = data.data;
    if (typeof result === "string") {
      return truncateSections(result, 2000);
    }
    return result;
  },
});
