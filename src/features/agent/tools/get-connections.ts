import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getConnections = tool({
  description: `Get ALL direct edges between two specific entities, grouped by edge type and direction.
USE THIS when the question is about the relationship between two SPECIFIC entities (e.g., "How is TP53 related to lung cancer?", "What edges connect Drug X to Gene Y?").
DO NOT use getRankedNeighbors for pairwise questions — that tool ranks ALL neighbors of a single seed, not the relationship between two entities.
DO NOT use findPaths here — that finds multi-hop paths through intermediaries.`,
  inputSchema: z.object({
    from: z.object({
      type: z.string().describe("Source entity type (e.g., 'Gene')"),
      id: z.string().describe("Source entity ID (e.g., 'ENSG00000141510')"),
    }),
    to: z.object({
      type: z.string().describe("Target entity type (e.g., 'Disease')"),
      id: z.string().describe("Target entity ID (e.g., 'MONDO_0005070')"),
    }),
    edgeTypes: z
      .array(z.string())
      .optional()
      .describe(
        "Optional: filter to specific edge types. Omit to get ALL edge types between the pair.",
      ),
    limitPerType: z
      .number()
      .optional()
      .default(5)
      .describe("Max edges returned per edge type (default 5, max 20)"),
  }),
  execute: async ({ from, to, edgeTypes, limitPerType }) => {
    try {
      const data = await agentFetch<{
        data: {
          textSummary?: string;
          from: { type: string; id: string; label: string };
          to: { type: string; id: string; label: string };
          connections: Array<{
            edgeType: string;
            direction: string;
            label: string;
            count: number;
            edges: Array<Record<string, unknown>>;
            hasMore: boolean;
          }>;
          summary: {
            totalEdgeTypes: number;
            totalEdges: number;
          };
        };
      }>("/graph/connections", {
        method: "POST",
        body: {
          from,
          to,
          ...(edgeTypes?.length ? { edgeTypes: edgeTypes.slice(0, 20) } : {}),
          limitPerType: Math.min(limitPerType ?? 5, 20),
          includeReverse: true,
        },
      });

      const connections = data.data.connections ?? [];

      if (connections.length === 0) {
        return {
          from: data.data.from,
          to: data.data.to,
          totalEdgeTypes: 0,
          totalEdges: 0,
          connections: [],
          message: `No direct edges found between ${from.type}:${from.id} and ${to.type}:${to.id}`,
          hint: "Try findPaths to check for indirect connections through intermediary nodes.",
        };
      }

      return {
        textSummary: data.data.textSummary,
        from: data.data.from,
        to: data.data.to,
        totalEdgeTypes: data.data.summary.totalEdgeTypes,
        totalEdges: data.data.summary.totalEdges,
        connections: connections.map((c) => ({
          edgeType: c.edgeType,
          direction: c.direction,
          label: c.label,
          count: c.count,
          hasMore: c.hasMore,
          edges: c.edges.slice(0, 5),
        })),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
