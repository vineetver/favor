/**
 * traverse mode: paths — shortest paths between two entities via /graph/paths,
 * with schema-driven edge type annotations for rich context.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchError, getCachedGraphSchema, trimEntitySubtitles } from "./graph";

type TraverseCmd = Extract<RunCommand, { command: "traverse" }>;

export async function handleTraversePaths(
  cmd: TraverseCmd,
): Promise<RunResult> {
  try {
    if (!cmd.from || !cmd.to) {
      return errorResult("paths mode requires 'from' and 'to' entity refs (format: 'Type:ID').");
    }

    const params = new URLSearchParams();
    params.set("from", cmd.from);
    params.set("to", cmd.to);
    params.set("maxHops", String(Math.min(cmd.max_hops ?? 3, 5)));
    params.set("limit", String(Math.min(cmd.limit ?? 5, 50)));

    const [data, schema] = await Promise.all([
      agentFetch<{
        data: {
          textSummary?: string;
          from: string;
          to: string;
          nodeColumns: string[];
          nodes: Record<string, unknown[]>;
          paths: Array<{
            text: string;
            nodes: string[];
            edges: unknown[][];
            score: number;
          }>;
        };
      }>(`/graph/paths?${params.toString()}`),
      getCachedGraphSchema(),
    ]);

    const { nodeColumns, nodes: nodesMap } = data.data;
    const typeIdx = nodeColumns.indexOf("type");
    const idIdx = nodeColumns.indexOf("id");
    const labelIdx = nodeColumns.indexOf("label");
    const subtitleIdx = nodeColumns.indexOf("subtitle");

    // Collect unique edge types used across all paths
    const usedEdgeTypes = new Set<string>();

    const paths = (data.data.paths ?? []).slice(0, cmd.limit ?? 5).map((p, idx) => {
      // Extract edge types from this path's edges array
      for (const edge of p.edges) {
        if (Array.isArray(edge) && typeof edge[0] === "string") {
          usedEdgeTypes.add(edge[0]);
        }
      }

      return {
        rank: idx + 1,
        length: p.nodes.length - 1,
        pathText: p.text,
        nodes: p.nodes.map((nodeKey) => {
          const row = nodesMap[nodeKey];
          if (!row) {
            const colonIdx = nodeKey.indexOf(":");
            return {
              type: colonIdx > 0 ? nodeKey.slice(0, colonIdx) : "Unknown",
              id: colonIdx > 0 ? nodeKey.slice(colonIdx + 1) : nodeKey,
              label: nodeKey,
            };
          }
          return {
            type: (row[typeIdx] as string) ?? "Unknown",
            id: (row[idIdx] as string) ?? nodeKey,
            label: (row[labelIdx] as string) ?? nodeKey,
          };
        }),
      };
    });

    if (paths.length === 0) {
      return errorResult(`No paths found between ${cmd.from} and ${cmd.to}`);
    }

    // Build edge type annotations from schema and embed into summary
    const edgeTypeAnnotations: Record<string, { label: string; description: string }> = {};
    for (const et of usedEdgeTypes) {
      const schemaEntry = schema.edgeTypes.find((e) => e.edgeType === et);
      if (schemaEntry) {
        edgeTypeAnnotations[et] = {
          label: schemaEntry.label ?? et,
          description: schemaEntry.description ?? "",
        };
      }
    }

    // Build enriched summary: base summary + edge type context
    const baseSummary = data.data.textSummary ?? `${paths.length} paths found`;
    const annotationLines = Object.entries(edgeTypeAnnotations).map(
      ([et, { description }]) => `${et}: ${description}`,
    );
    const textSummary = annotationLines.length > 0
      ? `${baseSummary}\n\nEdge types in these paths:\n${annotationLines.join("\n")}`
      : baseSummary;

    return {
      text_summary: textSummary,
      data: {
        _method: "Shortest path search through the knowledge graph. Each path shows a chain of entities connected by typed relationships.",
        from: data.data.from,
        to: data.data.to,
        edgeAnnotations: edgeTypeAnnotations,
        paths,
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}
