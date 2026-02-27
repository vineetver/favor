import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getEntityContext = tool({
  description: `Get summary info for an entity: description, key facts, and which edge types are available (with counts).
WHEN TO USE: Before calling getRankedNeighbors when unsure which edge types exist for an entity. Also useful for entity descriptions and connection overview.
WHEN NOT TO USE: To find ranked neighbors → getRankedNeighbors. To search by name → searchEntities.`,
  inputSchema: z.object({
    type: z.string().describe("Entity type (e.g. 'Gene', 'Disease', 'Drug')"),
    id: z.string().describe("Entity ID (e.g. 'ENSG00000012048')"),
  }),
  execute: async ({ type, id }) => {
    try {
      const data = await agentFetch<{
        data: {
          entities?: Array<{
            entity: { type: string; id: string; label: string };
            summary?: {
              description?: string;
              keyFacts?: string[];
              totalConnections?: number;
              connectedTypes?: string[];
              connectionCounts?: Array<{ edgeType: string; direction: string; targetType: string; count: number }> | Record<string, number>;
            };
            evidence?: {
              sourceCount?: number;
              topSources?: string[];
            };
          }>;
        };
      }>("/graph/context", {
        method: "POST",
        body: {
          entities: [{ type, id }],
          depth: "minimal",
        },
      });

      const entityData = data.data?.entities?.[0];
      if (!entityData) {
        return {
          error: true,
          message: `No context found for ${type}:${id}`,
          hint: "Verify the entity type and ID with searchEntities.",
        };
      }

      // Format connectionCounts as availableEdgeTypes: "EDGE_TYPE (count)" sorted by count desc
      // API returns an array of {edgeType, direction, targetType, count} — deduplicate by edgeType (self-edges appear twice)
      const rawCounts = entityData.summary?.connectionCounts;
      let edgeEntries: Array<{ edge: string; count: number }>;
      if (Array.isArray(rawCounts)) {
        const deduped = new Map<string, number>();
        for (const c of rawCounts as Array<{ edgeType: string; count: number }>) {
          const prev = deduped.get(c.edgeType) ?? 0;
          if (c.count > prev) deduped.set(c.edgeType, c.count);
        }
        edgeEntries = [...deduped.entries()].map(([edge, count]) => ({ edge, count }));
      } else {
        edgeEntries = Object.entries(rawCounts ?? {}).map(([edge, count]) => ({ edge, count: count as number }));
      }
      const availableEdgeTypes = edgeEntries
        .sort((a, b) => b.count - a.count)
        .map((c) => `${c.edge} (${c.count})`)
        .slice(0, 15);

      return {
        entity: entityData.entity,
        description: entityData.summary?.description,
        totalConnections: entityData.summary?.totalConnections,
        availableEdgeTypes,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
