import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

export const graphTraverse = tool({
  description: `Multi-step graph traversal chaining 2+ edge types in one call. Direction is auto-inferred per step. Returns edge scores for sort fields.
WHEN TO USE: "Drugs targeting genes in pathway X" (Pathway→Gene→Drug), "Tissues where disease genes are expressed" (Disease→Gene→Tissue), "Phenotypes of diseases linked to gene Y" (Gene→Disease→Phenotype). Best for multi-hop chains that would otherwise require multiple getRankedNeighbors calls.
WHEN NOT TO USE: Single-hop neighbors → getRankedNeighbors. Path between two specific entities → findPaths. Shared neighbors → getSharedNeighbors.
TIP: sort="-fieldName" on steps ranks results, but may place NULLs first for sparse fields. For reliable single-hop ranking, prefer getRankedNeighbors.`,
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
            .describe("Edge types for this step (e.g. ['GENE_PARTICIPATES_IN_PATHWAY'])"),
          limit: z
            .number()
            .optional()
            .default(20)
            .describe("Max nodes per step (default 20, max 1000)"),
          sort: z
            .string()
            .optional()
            .describe("Sort field, prefix '-' for descending (e.g. '-ot_score')"),
          overlayOnly: z
            .boolean()
            .optional()
            .describe("If true, only add edges to existing nodes — no new nodes added. Useful for cross-linking."),
        }),
      )
      .min(1)
      .max(5)
      .describe("Traversal steps (1-5). Each step expands the frontier by one hop."),
  }),
  execute: async ({ seeds, steps }) => {
    try {
      // Collect sort fields from steps so edge scores are included in the response
      const edgeFieldSet = new Set<string>(["evidence_count"]);
      for (const step of steps) {
        if (step.sort) {
          edgeFieldSet.add(step.sort.replace(/^-/, ""));
        }
      }

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
          select: { nodeFields: [], edgeFields: [...edgeFieldSet].slice(0, 20) },
          limits: { maxNodes: 500, maxEdges: 2000 },
        },
        timeout: 45_000,
      });

      const nodeMap = data.data.nodes;
      const nodeEntries = Object.entries(nodeMap);

      // Build label lookup for edges
      const labelOf = (key: string): string =>
        nodeMap[key]?.entity?.label ?? key;

      const nodes = nodeEntries.slice(0, 100).map(([, n]) => ({
        type: n.entity.type,
        id: n.entity.id,
        label: n.entity.label,
      }));

      const edges = data.data.edges.slice(0, 200).map((e) => {
        // Filter out null/undefined field values to save LLM context tokens
        const nonNullFields: Record<string, unknown> = {};
        if (e.fields) {
          for (const [k, v] of Object.entries(e.fields)) {
            if (v != null) nonNullFields[k] = v;
          }
        }
        return {
          type: e.type,
          from: labelOf(e.from),
          to: labelOf(e.to),
          ...(Object.keys(nonNullFields).length > 0 ? { scores: nonNullFields } : {}),
        };
      });

      if (nodes.length === 0) {
        return {
          error: true,
          message: "Traversal returned no nodes. Check that seeds exist and edge types are valid.",
          hint: "Use getEntityContext to verify available edge types for the seed entities.",
        };
      }

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
