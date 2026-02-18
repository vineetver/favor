import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";

export const compareEntities = tool({
  description:
    "Compare 2-5 entities of the same type. Shows shared and unique relationships across edge types, with Jaccard similarity scores. Great for comparing genes (BRCA1 vs TP53), diseases, or drugs.",
  inputSchema: z.object({
    entities: z
      .array(
        z.object({
          type: z.string().describe("Entity type"),
          id: z.string().describe("Entity ID"),
        }),
      )
      .min(2)
      .max(5)
      .describe("Entities to compare (2-5, must be same type)"),
  }),
  execute: async ({ entities }) => {
    const data = await agentFetch<{
      data: {
        entities: Array<{ type: string; id: string; label: string }>;
        comparisons: Record<
          string,
          {
            label: string;
            shared: Array<{ type: string; id: string; label: string }>;
            unique: Record<string, Array<{ type: string; id: string; label: string }>>;
            counts: { shared: number; total: number };
          }
        >;
        overallSimilarity: {
          sharedNeighborCount: number;
          jaccardIndex: number;
        };
      };
    }>("/graph/compare", {
      method: "POST",
      body: { entities },
    });

    const result = data.data;

    // Compress: top 5 shared + top 5 unique per entity per edge type + Jaccard scores
    const sharedByEdgeType: Record<string, string[]> = {};
    const uniqueByEntity: Record<string, Record<string, string[]>> = {};
    const jaccardScores: Record<string, number> = {};

    for (const [edgeType, comp] of Object.entries(result.comparisons ?? {})) {
      sharedByEdgeType[edgeType] = (comp.shared ?? [])
        .slice(0, 5)
        .map((e) => e.label ?? `${e.type}:${e.id}`);

      if (comp.counts) {
        jaccardScores[edgeType] =
          comp.counts.total > 0 ? comp.counts.shared / comp.counts.total : 0;
      }

      if (comp.unique) {
        for (const [entityId, uniqueEntities] of Object.entries(comp.unique)) {
          if (!uniqueByEntity[entityId]) uniqueByEntity[entityId] = {};
          uniqueByEntity[entityId][edgeType] = (uniqueEntities ?? [])
            .slice(0, 5)
            .map((e) => e.label ?? `${e.type}:${e.id}`);
        }
      }
    }

    return {
      entities: result.entities,
      sharedByEdgeType,
      uniqueByEntity,
      jaccardScores,
      overallSimilarity: result.overallSimilarity,
    };
  },
});
