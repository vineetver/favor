import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

/**
 * Extract a display label from a compare API neighbor item.
 * The API may return items in various shapes:
 *  - Flat EntityRef: { type, id, label }
 *  - Wrapped: { entity: { type, id, label } }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLabel(item: any): string {
  if (item?.label) return item.label;
  if (item?.entity?.label) return item.entity.label;
  if (item?.neighbor?.label) return item.neighbor.label;
  const t = item?.type ?? item?.entity?.type ?? item?.neighbor?.type;
  const id = item?.id ?? item?.entity?.id ?? item?.neighbor?.id;
  if (t && id) return `${t}:${id}`;
  return "unknown";
}

export const compareEntities = tool({
  description: `Compare 2-5 entities of the same type. Shows shared and unique neighbors per edge type with counts, plus overall similarity.
WHEN TO USE: "Compare BRCA1 and TP53", "How similar are these genes?", "What do drugs X and Y have in common?" — any side-by-side comparison.
WHEN NOT TO USE: Finding what specific entities share (list of shared items) → getSharedNeighbors. Direct edges between two entities → getConnections.`,
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await agentFetch<{ data: any; meta?: any }>("/graph/compare", {
        method: "POST",
        body: { entities },
      });

      const result = data.data;
      const textSummary = result.textSummary as string | undefined;

      // Build per-edge-type comparison with raw counts + sample labels
      const comparisons: Record<
        string,
        { sharedCount: number; sharedSample: string[]; uniqueCounts: Record<string, number>; uniqueSamples: Record<string, string[]> }
      > = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const [edgeType, comp] of Object.entries(result.comparisons ?? {}) as [string, any][]) {
        const sharedItems = comp.shared ?? [];
        const sharedCount = sharedItems.length;

        // Skip edge types with no shared and no unique
        const uniqueEntries = Object.entries(comp.unique ?? {}) as [string, any[]][];
        const totalUnique = uniqueEntries.reduce((sum, [, items]) => sum + (items?.length ?? 0), 0);
        if (sharedCount === 0 && totalUnique === 0) continue;

        const sharedSample = sharedItems.slice(0, 5).map(extractLabel).filter((l: string) => l !== "unknown");

        const uniqueCounts: Record<string, number> = {};
        const uniqueSamples: Record<string, string[]> = {};
        for (const [entityId, uniqueItems] of uniqueEntries) {
          const items = uniqueItems ?? [];
          if (items.length === 0) continue;
          uniqueCounts[entityId] = items.length;
          uniqueSamples[entityId] = items.slice(0, 3).map(extractLabel).filter((l: string) => l !== "unknown");
        }

        comparisons[edgeType] = {
          sharedCount,
          sharedSample,
          uniqueCounts,
          uniqueSamples,
        };
      }

      // Build label map from entities for readable unique keys
      const entityLabels: Record<string, string> = {};
      for (const ent of result.entities ?? []) {
        entityLabels[ent.id] = ent.label;
      }

      // Re-key uniqueCounts/uniqueSamples with labels instead of IDs
      for (const comp of Object.values(comparisons)) {
        const labeledUniqueCounts: Record<string, number> = {};
        const labeledUniqueSamples: Record<string, string[]> = {};
        for (const [eid, count] of Object.entries(comp.uniqueCounts)) {
          const label = entityLabels[eid] ?? eid;
          labeledUniqueCounts[label] = count;
          if (comp.uniqueSamples[eid]) {
            labeledUniqueSamples[label] = comp.uniqueSamples[eid];
          }
        }
        comp.uniqueCounts = labeledUniqueCounts;
        comp.uniqueSamples = labeledUniqueSamples;
      }

      return {
        textSummary,
        entities: result.entities,
        overallSimilarity: result.overallSimilarity,
        comparisons,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
