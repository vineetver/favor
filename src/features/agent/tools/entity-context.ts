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
              connectionCounts?: Record<string, number>;
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
      const connectionCounts = entityData.summary?.connectionCounts ?? {};
      const availableEdgeTypes = Object.entries(connectionCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([edge, count]) => `${edge} (${count})`)
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
