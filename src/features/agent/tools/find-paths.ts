import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import type { CompressedPath } from "../types";

export const findPaths = tool({
  description:
    "Find shortest paths between two entities in the knowledge graph. Shows how entities are connected through intermediate nodes. Format: 'Type:ID' (e.g., 'Gene:ENSG00000012048').",
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
  execute: async ({ from, to, maxHops, limit }): Promise<CompressedPath[]> => {
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

    return (data.data.paths ?? []).slice(0, 3).map((p) => ({
      rank: p.rank,
      length: p.length,
      pathText: p.pathText,
      nodes: p.nodes,
    }));
  },
});
