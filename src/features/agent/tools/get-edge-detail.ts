import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

// Properties that are too large for LLM consumption (arrays of 100+ items)
const HEAVY_PROPS = new Set([
  "disease_ids", "disease_names", "target_uniprot",
  "pubmed_ids", "source_record_id",
]);

/** Strip heavy array props from an edge to keep token usage reasonable. */
function trimEdge(raw: Record<string, unknown>): Record<string, unknown> {
  // Handle edges with nested props object (from /graph/edge)
  const props = (raw.props ?? raw) as Record<string, unknown>;
  const trimmed: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(props)) {
    if (HEAVY_PROPS.has(key)) continue;
    // Cap remaining arrays at 5 items
    if (Array.isArray(val) && val.length > 5) {
      trimmed[key] = val.slice(0, 5);
      trimmed[`${key}_count`] = val.length;
    } else {
      trimmed[key] = val;
    }
  }

  // Preserve evidence if present (usually small)
  if (raw.evidence) {
    trimmed.evidence = raw.evidence;
  }

  return trimmed;
}

export const getEdgeDetail = tool({
  description: `Get detailed edge properties and evidence between two entities for ONE edge type. Uses Type:ID format.
WHEN TO USE: After getConnections, to drill into a specific edge type's evidence/properties. "Show me the DRUG_ACTS_ON_GENE evidence between metformin and NDUFS8."
WHEN NOT TO USE: To discover which edge types exist between two entities → getConnections first. For ranked neighbor lists → getRankedNeighbors.`,
  inputSchema: z.object({
    from: z
      .string()
      .describe("Source entity in Type:ID format (e.g., 'Drug:CHEMBL1431')"),
    to: z
      .string()
      .describe("Target entity in Type:ID format (e.g., 'Gene:ENSG00000110717')"),
    edgeType: z
      .string()
      .describe("The specific edge type (e.g., 'DRUG_ACTS_ON_GENE')"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max edge instances to return (default 5, max 20)"),
  }),
  execute: async ({ from, to, edgeType, limit }) => {
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("edgeType", edgeType);
      params.set("limit", String(Math.min(limit ?? 5, 20)));

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
        edges: edges.slice(0, 5).map(trimEdge),
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
