import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { CompressedNeighbor } from "../types";

export const getRankedNeighbors = tool({
  description:
    "Get ranked neighbors of an entity by edge type. Use for: top genes for a disease, drugs targeting a gene, pathways a gene participates in. Returns entities ranked by relevance score. Prefer this over graphTraverse for simple ranked lookups.",
  inputSchema: z.object({
    type: z.string().describe("Source entity type (e.g., 'Disease')"),
    id: z.string().describe("Source entity ID (e.g., 'MONDO_0007254')"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g., 'ASSOCIATED_WITH_DISEASE'). Must exist in the Edge Catalog."),
    direction: z
      .enum(["in", "out", "both"])
      .optional()
      .default("out")
      .describe("Edge direction from the source entity"),
    limit: z.number().optional().default(20).describe("Max neighbors to return"),
    scoreField: z
      .string()
      .optional()
      .describe("Field to rank by (e.g., 'overall_score'). Must be listed under 'rank:' for this edge type."),
    expandOntology: z
      .boolean()
      .optional()
      .describe("Expand ontology hierarchies (include subtypes/descendants)"),
  }),
  execute: async ({
    type,
    id,
    edgeType,
    direction,
    limit,
    scoreField,
    expandOntology,
  }): Promise<CompressedNeighbor[] | { error: boolean; message: string; hint?: string }> => {
    try {
      const data = await agentFetch<{
        data: {
          neighbors: Array<{
            entity: { type: string; id: string; label: string };
            rank: number;
            score?: number;
            explanation?: string;
          }>;
        };
      }>("/graph/ranked-neighbors", {
        method: "POST",
        body: {
          seed: { type, id },
          edgeType,
          direction: direction ?? "out",
          limit: Math.min(limit ?? 20, 50),
          scoreField,
          expandDescendants: expandOntology,
        },
      });

      const neighbors = (data.data?.neighbors ?? []).slice(0, 20).map((n) => ({
        entity: n.entity,
        rank: n.rank,
        score: n.score,
        explanation: n.explanation,
      }));

      if (neighbors.length === 0) {
        return {
          error: true,
          message: `No neighbors found for ${type}:${id} via ${edgeType} (direction=${direction ?? "out"})`,
          hint: "Try a different edge type, direction, or verify the entity ID with searchEntities.",
        };
      }

      return neighbors;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
