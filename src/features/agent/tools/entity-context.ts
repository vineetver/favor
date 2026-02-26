import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getEntityContext = tool({
  description:
    `Get detailed context for a specific entity including description, key facts, and available edge types with counts.
The availableEdgeTypes field tells you exactly which edge types exist for this entity and how many connections each has — use this to pick the correct edgeType for getRankedNeighbors.
WHEN TO USE: Before calling getRankedNeighbors, if you're unsure which edge types are valid for an entity. Also useful for getting entity descriptions.`,
  inputSchema: z.object({
    type: z.string().describe("Entity type (e.g., 'Gene', 'Disease', 'Drug')"),
    id: z.string().describe("Entity ID (e.g., 'ENSG00000012048', 'MONDO_0007254')"),
    depth: z
      .enum(["minimal", "standard", "detailed"])
      .optional()
      .default("minimal")
      .describe("Level of detail: 'minimal' for overview (default), 'standard' for more, 'detailed' for deep dives"),
  }),
  execute: async ({ type, id, depth }) => {
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
              edgeTypeCount?: number;
              topEdgeTypes?: string[];
            };
          }>;
        };
      }>("/graph/context", {
        method: "POST",
        body: {
          entities: [{ type, id }],
          depth,
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

      // Surface connectionCounts as availableEdgeTypes so the agent knows
      // which edge types can be used with getRankedNeighbors for this entity
      const connectionCounts = entityData.summary?.connectionCounts ?? {};
      const availableEdgeTypes = Object.entries(connectionCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([edge, count]) => `${edge} (${count})`)
        .slice(0, 20);

      return {
        entity: entityData.entity,
        description: entityData.summary?.description,
        keyFacts: entityData.summary?.keyFacts?.slice(0, 10),
        totalConnections: entityData.summary?.totalConnections,
        availableEdgeTypes,
        evidence: entityData.evidence
          ? {
              sourceCount: entityData.evidence.sourceCount,
              topSources: entityData.evidence.topSources?.slice(0, 5),
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
