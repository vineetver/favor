import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const graphTraverse = tool({
  description:
    "LAST RESORT: Multi-step graph traversal for complex multi-hop queries that simpler tools can't answer. Prefer searchEntities, getRankedNeighbors, findPaths, getSharedNeighbors, and compareEntities first.",
  inputSchema: z.object({
    seeds: z
      .array(
        z.object({
          type: z.string().describe("Entity type"),
          id: z.string().describe("Entity ID"),
        }),
      )
      .min(1)
      .max(10)
      .describe("Starting entities (1-10)"),
    steps: z
      .array(
        z.object({
          edgeTypes: z
            .array(z.string())
            .describe("Edge types to traverse in this step"),
          direction: z
            .enum(["in", "out"])
            .optional()
            .describe("Edge direction. Auto-inferred from schema when omitted."),
          limit: z
            .number()
            .optional()
            .describe("Max nodes per step (1-1000)"),
          sort: z
            .string()
            .optional()
            .describe("Sort field, prefix '-' for descending (e.g., '-ot_score')"),
          filters: z
            .record(z.unknown())
            .optional()
            .describe("Edge property filters (e.g., { 'score__gte': 0.5 })"),
          overlayOnly: z
            .boolean()
            .optional()
            .describe("If true, edges only to existing nodes — no new nodes, frontier unchanged"),
        }),
      )
      .min(1)
      .max(5)
      .describe("Traversal steps (1-5)"),
    nodeFields: z
      .array(z.string())
      .optional()
      .describe("Node property fields to return (max 20)"),
    edgeFields: z
      .array(z.string())
      .optional()
      .describe("Edge property fields to return (max 20)"),
  }),
  execute: async ({ seeds, steps, nodeFields, edgeFields }) => {
    try {
      const data = await agentFetch<{
        data: {
          nodes: Record<
            string,
            {
              entity: { type: string; id: string; label: string };
              fields?: Record<string, unknown>;
            }
          >;
          edges: Array<{
            type: string;
            direction: string;
            from: string;
            to: string;
            fields?: Record<string, unknown>;
            evidence?: unknown;
          }>;
          steps: Array<{
            stepIndex: number;
            edgeTypes: string[];
            direction: string;
            resultType?: string;
            count: number;
          }>;
        };
        meta: {
          warnings?: string[];
          cost?: { nodesResolved: number; edgesReturned: number; queriesExecuted: number };
        };
      }>("/graph/query", {
        method: "POST",
        body: {
          seeds,
          steps,
          select: {
            nodeFields: nodeFields?.slice(0, 20),
            edgeFields: edgeFields?.slice(0, 20),
          },
          limits: { maxNodes: 500, maxEdges: 2000 },
        },
        timeout: 45_000,
      });

      const nodeEntries = Object.entries(data.data.nodes);
      const nodes = nodeEntries.slice(0, 100).map(([key, n]) => ({
        key,
        type: n.entity.type,
        id: n.entity.id,
        label: n.entity.label,
        ...(n.fields ? { fields: n.fields } : {}),
      }));

      const edges = data.data.edges.slice(0, 200).map((e) => ({
        type: e.type,
        from: e.from,
        to: e.to,
        ...(e.fields ? { fields: e.fields } : {}),
      }));

      return {
        nodeCount: nodeEntries.length,
        edgeCount: data.data.edges.length,
        steps: data.data.steps,
        nodes,
        edges,
        warnings: data.meta.warnings ?? [],
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
