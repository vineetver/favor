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
      .default(4)
      .describe("Maximum path length (default 4, max 10)"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max number of paths to return (default 5, max 50)"),
    edgeTypes: z
      .string()
      .optional()
      .describe("Comma-separated edge types to filter (e.g., 'GENE_ASSOCIATED_WITH_DISEASE,DRUG_ACTS_ON_GENE')"),
  }),
  execute: async ({ from, to, maxHops, limit, edgeTypes }): Promise<CompressedPath[] | { error: boolean; message: string }> => {
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("maxHops", String(Math.min(maxHops ?? 4, 10)));
      params.set("limit", String(Math.min(limit ?? 5, 50)));
      if (edgeTypes) params.set("edgeTypes", edgeTypes);

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

      const maxPaths = Math.min(limit ?? 5, 50);
      const paths = (data.data.paths ?? []).slice(0, maxPaths).map((p) => ({
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
