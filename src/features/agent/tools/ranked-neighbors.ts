import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getRankedNeighbors = tool({
  description: `Rank ALL neighbors of a SINGLE entity by a numeric edge score. Returns a scored list for one-to-many exploration.
WHEN TO USE: "Top genes for disease X", "Highest-scoring drug targets of gene Y", "Best pathways for gene Z" — any question asking for a ranked list from ONE seed entity.
WHEN NOT TO USE:
- Two specific entities ("how is A related to B?") → use getConnections instead.
- Path between entities ("how are A and B connected?") → use findPaths instead.
- Shared neighbors of multiple entities → use getSharedNeighbors instead.
- Side-by-side comparison → use compareEntities instead.
Direction and scoreField are auto-inferred by the server. Do not pass scoreField — the server always selects the correct default.`,
  inputSchema: z.object({
    type: z.string().describe("Source entity type (e.g., 'Disease')"),
    id: z.string().describe("Source entity ID (e.g., 'MONDO_0007254')"),
    edgeType: z
      .string()
      .describe("Edge type to traverse (e.g., 'GENE_ASSOCIATED_WITH_DISEASE'). Must exist in the schema."),
    direction: z
      .enum(["in", "out", "both"])
      .optional()
      .describe("Edge direction. Auto-inferred from schema when omitted. Override only for self-edges (e.g., GENE_INTERACTS_WITH_GENE)."),
    limit: z.number().optional().default(20).describe("Max neighbors to return"),
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
    expandOntology,
  }) => {
    try {
      const data = await agentFetch<{
        data: {
          textSummary?: string;
          neighbors: Array<{
            entity: { type: string; id: string; label: string };
            rank: number;
            score?: number;
            explanation?: string;
          }>;
        };
        meta: {
          resolved?: {
            direction?: string;
            scoreField?: string;
            edgeSchema?: { fromType: string; toType: string };
          };
        };
      }>("/graph/ranked-neighbors", {
        method: "POST",
        body: {
          seed: { type, id },
          edgeType,
          ...(direction ? { direction } : {}),
          limit: Math.min(limit ?? 20, 100),
          expandDescendants: expandOntology,
        },
      });

      const raw = data.data?.neighbors ?? [];
      const neighbors = raw.slice(0, 50).map((n) => ({
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
        textSummary: data.data.textSummary,
        resolved: data.meta?.resolved ?? {},
        scoreField: data.meta?.resolved?.scoreField ?? "(auto)",
        totalReturned: neighbors.length,
        neighbors,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
