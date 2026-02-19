import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const getEdgeDetail = tool({
  description: `Get specific edge instances (with full properties and evidence) between two entities for a SINGLE edge type.
Use AFTER getConnections when you want to drill into a specific edge type's evidence/properties.
Example: "Show me the TARGETS evidence between Imatinib and BCR-ABL."`,
  inputSchema: z.object({
    from: z
      .string()
      .describe("Source entity in Type:ID format (e.g., 'Drug:CHEMBL941')"),
    to: z
      .string()
      .describe("Target entity in Type:ID format (e.g., 'Gene:ENSG00000097007')"),
    edgeType: z
      .string()
      .describe("The specific edge type (e.g., 'TARGETS')"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Max edge instances to return (default 10, max 50)"),
  }),
  execute: async ({ from, to, edgeType, limit }) => {
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("edgeType", edgeType);
      params.set("limit", String(Math.min(limit ?? 10, 50)));

      const data = await agentFetch<{
        data: {
          from: { type: string; id: string; label: string };
          to: { type: string; id: string; label: string };
          edgeType: string;
          edges: Array<Record<string, unknown>>;
          count: number;
          hasMore: boolean;
        };
      }>(`/graph/edge?${params.toString()}`);

      const edges = data.data.edges ?? [];

      if (edges.length === 0) {
        return {
          error: true,
          message: `No ${edgeType} edges found between ${from} and ${to}`,
          hint: "Use getConnections to see all edge types between these entities, or verify the edge type with getGraphSchema.",
        };
      }

      return {
        from: data.data.from,
        to: data.data.to,
        edgeType: data.data.edgeType,
        totalInstances: data.data.count,
        hasMore: data.data.hasMore,
        edges: edges.slice(0, 10),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
