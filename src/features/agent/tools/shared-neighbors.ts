import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getSharedNeighbors = tool({
  description: `Find entities that are shared neighbors of 2+ input entities via a specific edge type. Direction is auto-inferred.
WHEN TO USE: "What pathways do genes X and Y share?", "Diseases in common between two genes", "Common drug targets."
WHEN NOT TO USE: Single entity neighbors → getRankedNeighbors. Direct edges between two entities → getConnections. Counts and similarity metrics → compareEntities.`,
  inputSchema: z.object({
    entities: z
      .array(
        z.object({
          type: z.string().describe("Entity type"),
          id: z.string().describe("Entity ID"),
        }),
      )
      .min(2)
      .describe("Entities to find shared neighbors for (2+, same type)"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g. 'GENE_PARTICIPATES_IN_PATHWAY'). Use getEntityContext to discover valid edge types."),
    limit: z.number().optional().default(20).describe("Max shared neighbors (default 20)"),
  }),
  execute: async ({ entities, edgeType, limit }) => {
    try {
      const data = await agentFetch<{
        data: {
          inputs: Array<{ type: string; id: string; label: string }>;
          intersectionType: string;
          neighborType: string;
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
          limit: Math.min(limit ?? 20, 50),
        },
      });

      const shared = data.data.sharedNeighbors ?? [];

      if (shared.length === 0) {
        const inputLabels = data.data.inputs?.map((i) => i.label).join(", ") ?? entities.map((e) => e.id).join(", ");
        return {
          error: true,
          message: `No shared ${data.data.neighborType ?? "neighbors"} found for [${inputLabels}] via ${edgeType}`,
          hint: "Try a different edge type, or use compareEntities for a broader comparison.",
        };
      }

      return {
        neighborType: data.data.neighborType,
        totalShared: data.data.counts.shared,
        neighbors: shared.slice(0, 20).map((s) => ({
          neighbor: s.neighbor,
          supportedBy: s.support.map((sup) => sup.from.label),
        })),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
