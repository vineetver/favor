import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { PatternsResult } from "../types";

export const findPatterns = tool({
  description: `Find subgraph patterns/motifs matching a structural template. Returns entities matching complex multi-hop patterns with optional edge property filtering.
WHEN TO USE: Complex queries like "genes associated with cancer that also target drug X", "drugs targeting genes in a pathway", hypothesis generation requiring structural motif matching.
WHEN NOT TO USE: Simple pairwise paths → findPaths. Single-hop neighbors → getRankedNeighbors. Direct edges → getConnections.
Define a pattern with node variables (var + type) and edge constraints (edge + from + to). Filter with property conditions. Returns matched entities with scores.`,
  inputSchema: z.object({
    pattern: z
      .array(
        z.union([
          z.object({
            var: z.string().describe("Variable name for this node (e.g. 'g', 'd', 'drug')"),
            type: z.string().describe("Node type (e.g. 'Gene', 'Disease', 'Drug')"),
          }),
          z.object({
            edge: z.string().describe("Edge type (e.g. 'GENE_ASSOCIATED_WITH_DISEASE', 'DRUG_ACTS_ON_GENE')"),
            from: z.string().describe("Source variable name"),
            to: z.string().describe("Target variable name"),
          }),
        ]),
      )
      .describe(
        "Pattern definition: array of node variables and edge constraints. " +
        "Example: [{var:'drug',type:'Drug'},{var:'g',type:'Gene'},{var:'d',type:'Disease'}," +
        "{edge:'DRUG_ACTS_ON_GENE',from:'drug',to:'g'},{edge:'GENE_ASSOCIATED_WITH_DISEASE',from:'g',to:'d'}]",
      ),
    return: z
      .array(z.string())
      .optional()
      .describe("Variable names to return in results (default: all node vars). E.g. ['g','d']"),
    filters: z
      .record(z.string())
      .optional()
      .describe("Property filters on variables. Key format: 'var.property__op'. E.g. {'d.disease_name__contains':'cancer','g.gene_symbol__eq':'BRCA1'}"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Max matches to return (default 50, max 100)"),
    edgeFields: z
      .array(z.string())
      .optional()
      .describe("Edge properties to include in results (e.g. ['score','ot_score']). Omit for compact response."),
  }),
  execute: async ({ pattern, return: returnVars, filters, limit, edgeFields }): Promise<PatternsResult | { error: boolean; message: string; hint?: string }> => {
    try {
      const body: Record<string, unknown> = {
        pattern,
        limit: Math.min(limit ?? 50, 100),
      };
      if (returnVars?.length) body.return = returnVars;
      if (filters && Object.keys(filters).length > 0) body.filters = filters;
      if (edgeFields?.length) {
        body.select = { edgeFields: edgeFields.slice(0, 20), includeEvidence: false, includeFieldMeta: false };
      }

      const data = await agentFetch<{
        data: {
          textSummary?: string;
          nodeColumns: string[];
          nodes: Record<string, unknown[]>;
          edgeColumns: string[];
          matches: Array<{
            vars: Record<string, string>;
            edges: unknown[][];
            score?: number;
          }>;
          counts: { returned: number; limit: number };
        };
      }>("/graph/patterns", {
        method: "POST",
        body: body,
      });

      const { nodeColumns, nodes: nodesMap, edgeColumns } = data.data;

      // Resolve column indices
      const typeIdx = nodeColumns.indexOf("type");
      const idIdx = nodeColumns.indexOf("id");
      const labelIdx = nodeColumns.indexOf("label");
      const edgeTypeIdx = edgeColumns.indexOf("type");
      const edgeFromIdx = edgeColumns.indexOf("from");
      const edgeToIdx = edgeColumns.indexOf("to");

      function hydrateNode(key: string): { type: string; id: string; label: string } {
        const row = nodesMap[key];
        if (!row) {
          const colonIdx = key.indexOf(":");
          return {
            type: colonIdx > 0 ? key.slice(0, colonIdx) : "Unknown",
            id: colonIdx > 0 ? key.slice(colonIdx + 1) : key,
            label: key,
          };
        }
        return {
          type: (row[typeIdx] as string) ?? "Unknown",
          id: (row[idIdx] as string) ?? key,
          label: (row[labelIdx] as string) ?? key,
        };
      }

      const matches = (data.data.matches ?? []).map((m) => ({
        vars: Object.fromEntries(
          Object.entries(m.vars).map(([varName, nodeKey]) => [varName, hydrateNode(nodeKey)]),
        ),
        edges: (m.edges ?? []).map((e) => ({
          type: (e[edgeTypeIdx] as string) ?? "unknown",
          from: (e[edgeFromIdx] as string) ?? "?",
          to: (e[edgeToIdx] as string) ?? "?",
        })),
        score: m.score,
      }));

      if (matches.length === 0) {
        return {
          error: true,
          message: "No pattern matches found",
          hint: "Try relaxing filters, using broader node types, or checking edge type names with getGraphSchema.",
        };
      }

      return {
        textSummary: data.data.textSummary,
        matches,
        counts: data.data.counts ?? { returned: matches.length, limit: limit ?? 50 },
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
