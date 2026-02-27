import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";

// ---------------------------------------------------------------------------
// Types matching the actual GET /graph/schema response
// ---------------------------------------------------------------------------

interface RawNodeType {
  nodeType: string;
  summaryFields: string[];
}

interface RawEdgeSchema {
  edgeType: string;
  fromType: string;
  toType: string;
  label?: string;
  defaultScoreField?: string;
  scoreFields?: string[];
}

interface RawSchemaResponse {
  meta: unknown;
  data: {
    nodeTypes: RawNodeType[];
    edgeTypes: RawEdgeSchema[];
  };
}

interface CompactEdge {
  edge: string;
  from: string;
  to: string;
  defaultScore?: string;
  scoreFields?: string[];
}

// ---------------------------------------------------------------------------
// Long-lived in-memory cache (schema is effectively static per session)
// ---------------------------------------------------------------------------

let cachedData: RawSchemaResponse["data"] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — schema doesn't change

async function fetchSchema(): Promise<RawSchemaResponse["data"]> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const resp = await agentFetch<RawSchemaResponse>("/graph/schema");
  cachedData = resp.data;
  cacheTimestamp = now;
  return cachedData;
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const getGraphSchema = tool({
  description: `Look up valid edge types in the graph schema. Fast and cached.
WHEN TO USE: Unsure which edgeType connects two entity types, or after an "unknown edge type" error.
WHEN NOT TO USE: If you already know the edge type. For a specific entity's connections → getEntityContext is more useful.`,
  inputSchema: z.object({
    nodeType: z
      .string()
      .optional()
      .describe(
        "Filter to edges where fromType or toType matches this node type (e.g., 'Disease', 'Gene'). Omit to get the full schema.",
      ),
  }),
  execute: async ({ nodeType }) => {
    try {
      const schema = await fetchSchema();

      const nodeTypeNames = schema.nodeTypes.map((n) => n.nodeType);

      let edges = schema.edgeTypes;

      if (nodeType) {
        const nt = nodeType.toLowerCase();
        edges = edges.filter(
          (e) =>
            e.fromType.toLowerCase() === nt ||
            e.toType.toLowerCase() === nt,
        );
      }

      const compactEdges: CompactEdge[] = edges.map((e) => ({
        edge: e.edgeType,
        from: e.fromType,
        to: e.toType,
      }));

      if (nodeType && compactEdges.length === 0) {
        return {
          nodeTypes: nodeTypeNames,
          edges: [],
          message: `No edges found for node type "${nodeType}".`,
          hint: `Valid node types: ${nodeTypeNames.join(", ")}`,
        };
      }

      return {
        nodeTypes: nodeTypeNames,
        edges: compactEdges,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
