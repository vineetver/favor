import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getSharedNeighbors = tool({
  description:
    "Find entities that are shared neighbors of multiple input entities via a specific edge type. For example: diseases shared between two genes, or pathways shared by a gene set.",
  inputSchema: z.object({
    entities: z
      .array(
        z.object({
          type: z.string().describe("Entity type"),
          id: z.string().describe("Entity ID"),
        }),
      )
      .min(2)
      .describe("Entities to find shared neighbors for"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g., 'PARTICIPATES_IN')"),
    direction: z
      .enum(["in", "out"])
      .optional()
      .describe("Edge direction. Auto-inferred from schema when omitted."),
    limit: z.number().optional().default(20).describe("Max shared neighbors"),
  }),
  execute: async ({ entities, edgeType, direction, limit }) => {
    try {
      const data = await agentFetch<{
        data: {
          sharedNeighbors: Array<{
            neighbor: { type: string; id: string; label: string };
            support: Array<{
              from: { type: string; id: string; label: string };
              edge: { type: string };
            }>;
          }>;
          counts: { shared: number };
        };
      }>("/graph/intersect", {
        method: "POST",
        body: {
          entities,
          edgeType,
          ...(direction ? { direction } : {}),
          limit: Math.min(limit ?? 20, 50),
        },
      });

      const shared = data.data.sharedNeighbors ?? [];
      return {
        totalShared: data.data.counts.shared,
        neighbors: shared.slice(0, 20).map((s) => ({
          neighbor: s.neighbor,
          supportCount: s.support.length,
        })),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
