import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getRankedNeighbors = tool({
  description: `Rank neighbors of ONE entity by edge score. Direction and scoreField are auto-selected by the server.
WHEN TO USE: "Top genes for disease X", "Drug targets of gene Y", "Pathways for gene Z" — any ranked list from a single seed.
WHEN NOT TO USE:
- Relationship between two specific entities → getConnections
- Path between entities → findPaths
- Shared neighbors of 2+ entities → getSharedNeighbors
- Side-by-side comparison → compareEntities
- Statistical enrichment of a gene set → runEnrichment`,
  inputSchema: z.object({
    type: z.string().describe("Entity type, e.g. 'Gene', 'Disease', 'Drug'"),
    id: z.string().describe("Entity ID, e.g. 'ENSG00000012048', 'MONDO_0007254'"),
    edgeType: z
      .string()
      .describe("Edge type to traverse, e.g. 'GENE_ASSOCIATED_WITH_DISEASE'. Use getGraphSchema or getEntityContext to discover valid edge types."),
    limit: z.number().optional().default(50).describe("Max neighbors (default 50, max 100). Use 50+ for downstream enrichment."),
    scoreField: z
      .string()
      .optional()
      .describe("Override the default score field for ranking. Use 'evidence_count' as fallback when default scores are sparse/zero. Omit to let the server auto-select."),
  }),
  execute: async ({
    type,
    id,
    edgeType,
    limit,
    scoreField,
  }) => {
    try {
      const data = await agentFetch<{
        data: {
          textSummary?: string;
          neighbors: Array<{
            entity: { type: string; id: string; label: string };
            rank: number;
            score?: number;
            explanation?: { supportingSeeds?: number; topSupportingSubtypes?: string[] };
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
          limit: Math.min(limit ?? 50, 100),
          ...(scoreField ? { scoreField } : {}),
        },
      });

      const raw = data.data?.neighbors ?? [];
      const neighbors = raw.slice(0, 50).map((n) => ({
        entity: { type: n.entity.type, id: n.entity.id, label: n.entity.label },
        rank: n.rank,
        score: n.score,
      }));

      if (neighbors.length === 0) {
        return {
          error: true,
          message: `No neighbors found for ${type}:${id} via ${edgeType}`,
          hint: "Check the edge type is valid for this entity type. Use getEntityContext to see available edge types, or getGraphSchema to look up the schema.",
        };
      }

      return {
        textSummary: data.data.textSummary,
        resolved: data.meta?.resolved ?? {},
        totalReturned: neighbors.length,
        neighbors,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
