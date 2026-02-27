import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

// Priority-ordered score fields — most informative first, universal fallbacks last
const PRIORITY_SCORE_FIELDS = [
  "ot_score", "affinity_median", "max_clinical_phase", "tpm_median",
  "l2g_score", "p_value_mlog", "onsides_pred1", "prr",
  "percent_identity", "alteration_frequency", "max_profile_evidence_score",
  "pharmgkb_score", "evidence_count", "num_sources",
];

/** Extract up to 3 representative score values from the first edge in a connection group. */
function extractTopScores(edges: Array<Record<string, unknown>> | undefined): Record<string, number> | undefined {
  if (!edges?.length) return undefined;
  const props = (edges[0].props ?? edges[0]) as Record<string, unknown>;
  const scores: Record<string, number> = {};
  let count = 0;
  for (const field of PRIORITY_SCORE_FIELDS) {
    if (count >= 3) break;
    const val = props[field];
    if (typeof val === "number" && !Number.isNaN(val)) {
      scores[field] = Math.round(val * 10000) / 10000;
      count++;
    }
  }
  return count > 0 ? scores : undefined;
}

export const getConnections = tool({
  description: `Get all direct edges between two specific entities, grouped by edge type. Includes top scores per edge type.
WHEN TO USE: "How is TP53 related to lung cancer?", "What connects Drug X to Gene Y?" — any question about the relationship between exactly two entities.
WHEN NOT TO USE: Ranked neighbors of ONE entity → getRankedNeighbors. Multi-hop indirect paths → findPaths. Full edge properties/evidence → getEdgeDetail.`,
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
        connections: connections.map((c) => {
          const scores = extractTopScores(c.edges);
          return {
            edgeType: c.edgeType,
            direction: c.direction,
            label: c.label,
            count: c.count,
            ...(scores ? { topEdgeScores: scores } : {}),
          };
        }),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
