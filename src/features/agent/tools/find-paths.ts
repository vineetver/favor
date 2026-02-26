import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { CompressedPath } from "../types";

export const findPaths = tool({
  description: `Find shortest INDIRECT paths between two entities through intermediate nodes. Shows the chain of connections (A → X → Y → B).
WHEN TO USE: "How is A connected to B?" when they may not share a direct edge, or when you want to discover intermediary nodes.
WHEN NOT TO USE: If you want DIRECT edges between two entities → use getConnections instead. findPaths finds multi-hop routes; getConnections finds direct edges.
Use 'Type:ID' format (e.g., 'Gene:ENSG00000012048'). Optionally filter by edge types with edgeTypes (csv).`,
  inputSchema: z.object({
    from: z
      .string()
      .describe("Source entity in Type:ID format (e.g., 'Gene:ENSG00000012048')"),
    to: z
      .string()
      .describe("Target entity in Type:ID format (e.g., 'Disease:MONDO_0007254')"),
    maxHops: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum path length (default 3, max 5)"),
    limit: z
      .number()
      .optional()
      .default(3)
      .describe("Max number of paths to return"),
  }),
  execute: async ({ from, to, maxHops, limit }): Promise<CompressedPath[] | { error: boolean; message: string }> => {
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("maxHops", String(Math.min(maxHops ?? 3, 5)));
      params.set("limit", String(Math.min(limit ?? 3, 5)));

      const data = await agentFetch<{
        data: {
          paths: Array<{
            rank: number;
            length: number;
            pathText: string;
            nodes: Array<{ type: string; id: string; label: string }>;
          }>;
        };
      }>(`/graph/paths?${params.toString()}`);

      const paths = (data.data.paths ?? []).slice(0, 3).map((p) => ({
        rank: p.rank,
        length: p.length,
        pathText: p.pathText,
        nodes: p.nodes,
      }));

      if (paths.length === 0) {
        return [];
      }

      return paths;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
