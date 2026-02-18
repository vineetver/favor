import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import type { CompressedNeighbor } from "../types";

export const getRankedNeighbors = tool({
  description:
    "Get ranked neighbors of an entity by edge type. For example: genes associated with a disease, drugs targeting a gene, pathways a gene participates in. Returns entities ranked by relevance score.",
  inputSchema: z.object({
    type: z.string().describe("Source entity type (e.g., 'Disease')"),
    id: z.string().describe("Source entity ID (e.g., 'MONDO_0007254')"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g., 'ASSOCIATED_WITH_DISEASE')"),
    direction: z
      .enum(["in", "out", "both"])
      .optional()
      .default("out")
      .describe("Edge direction from the source entity"),
    limit: z.number().optional().default(20).describe("Max neighbors to return"),
    scoreField: z
      .string()
      .optional()
      .describe("Field to rank by (e.g., 'overall_score')"),
    expandOntology: z
      .boolean()
      .optional()
      .describe("Whether to expand ontology hierarchies (include subtypes/descendants)"),
  }),
  execute: async ({
    type,
    id,
    edgeType,
    direction,
    limit,
    scoreField,
    expandOntology,
  }): Promise<CompressedNeighbor[]> => {
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

    return (data.data?.neighbors ?? []).slice(0, 20).map((n) => ({
      entity: n.entity,
      rank: n.rank,
      score: n.score,
      explanation: n.explanation,
    }));
  },
});
