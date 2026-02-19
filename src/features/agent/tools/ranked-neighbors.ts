import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getRankedNeighbors = tool({
  description: `Get ranked neighbors of an entity by edge type. Returns neighbors sorted by a numeric edge score.
- The returned 'score' is the aggregated value of the scoreField across all edges between the seed and that neighbor (default aggregation: sum). When expandOntology=true, scores are aggregated across all descendant seeds.
- Direction and scoreField are auto-inferred by the server. Omit them unless you need to override (e.g., for self-edges like INTERACTS_WITH).
- Prefer this over graphTraverse for simple ranked lookups.`,
  inputSchema: z.object({
    type: z.string().describe("Source entity type (e.g., 'Disease')"),
    id: z.string().describe("Source entity ID (e.g., 'MONDO_0007254')"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g., 'ASSOCIATED_WITH_DISEASE'). Must exist in the Edge Catalog."),
    direction: z
      .enum(["in", "out", "both"])
      .optional()
      .describe("Edge direction. Auto-inferred from schema when omitted. Override only for self-edges (e.g., INTERACTS_WITH)."),
    limit: z.number().optional().default(20).describe("Max neighbors to return"),
    scoreField: z
      .string()
      .optional()
      .describe("NUMERIC field to rank by (e.g., 'overall_score'). Auto-defaults to the edge type's default score field when omitted. NEVER use a 'filter:' field here."),
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
  }) => {
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
          ...(direction ? { direction } : {}),
          limit: Math.min(limit ?? 20, 50),
          ...(scoreField ? { scoreField } : {}),
          expandDescendants: expandOntology,
        },
      });

      const raw = data.data?.neighbors ?? [];
      const neighbors = raw.slice(0, 20).map((n) => ({
        entity: n.entity,
        rank: n.rank,
        score: n.score,
        explanation:
          typeof n.explanation === "string"
            ? n.explanation
            : n.explanation
              ? JSON.stringify(n.explanation)
              : undefined,
      }));

      if (neighbors.length === 0) {
        return {
          error: true,
          message: `No neighbors found for ${type}:${id} via ${edgeType}`,
          hint: "Try a different edge type or verify the entity ID with searchEntities.",
        };
      }

      return {
        scoreField: scoreField ?? "(auto-resolved by server)",
        scoreMeaning: "Aggregated score across all edges between the seed and each neighbor. Higher = stronger association.",
        totalReturned: neighbors.length,
        neighbors,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
