import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { CompressedPath } from "../types";

export const findPaths = tool({
  description: `Find shortest paths between two entities through intermediate nodes (A → X → Y → B). Shows the chain of connections.
WHEN TO USE: "How is gene X connected to disease Y?", "What links drug A to gene B?" — when you want to discover intermediate entities and indirect connections.
WHEN NOT TO USE: Direct edges between two entities → getConnections. Ranked neighbors of one entity → getRankedNeighbors.
Both 'from' and 'to' use Type:ID format (e.g. 'Gene:ENSG00000012048', 'Drug:CHEMBL1431').`,
  inputSchema: z.object({
    from: z
      .string()
      .describe("Source entity as Type:ID (e.g. 'Gene:ENSG00000012048')"),
    to: z
      .string()
      .describe("Target entity as Type:ID (e.g. 'Disease:MONDO_0007254')"),
    maxHops: z
      .number()
      .optional()
      .default(3)
      .describe("Max path length (default 3, max 5). Higher values are slower and noisier."),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max paths to return (default 5)"),
    edgeTypes: z
      .array(z.string())
      .optional()
      .describe("Filter to specific edge types (e.g. ['GENE_ASSOCIATED_WITH_DISEASE', 'DRUG_ACTS_ON_GENE']). Omit for all edge types."),
  }),
  execute: async ({ from, to, maxHops, limit, edgeTypes }): Promise<CompressedPath[] | { error: boolean; message: string; hint?: string }> => {
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("maxHops", String(Math.min(maxHops ?? 3, 5)));
      params.set("limit", String(Math.min(limit ?? 5, 50)));
      if (edgeTypes?.length) params.set("edgeTypes", edgeTypes.join(","));

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
        nodes: p.nodes.map((n) => ({ type: n.type, id: n.id, label: n.label })),
      }));

      if (paths.length === 0) {
        return {
          error: true,
          message: `No paths found between ${from} and ${to} within ${maxHops ?? 3} hops`,
          hint: "Try increasing maxHops, removing edgeTypes filter, or verify both entities exist with searchEntities.",
        };
      }

      return paths;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
