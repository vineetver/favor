/**
 * traverse mode: paths — shortest paths between two entities via /graph/paths,
 * with schema-driven edge type annotations for rich context.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchError, getCachedGraphSchema, humanEdgeLabel } from "./graph";
import { okResult, emptyResult, TraceCollector } from "../run-result";

type TraverseCmd = Extract<RunCommand, { command: "traverse" }>;

export async function handleTraversePaths(
  cmd: TraverseCmd,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.from || !cmd.to) {
      return errorResult("paths mode requires 'from' and 'to' entity refs (format: 'Type:ID').", tc);
    }

    const params = new URLSearchParams();
    params.set("from", cmd.from);
    params.set("to", cmd.to);
    params.set("maxHops", String(Math.min(cmd.max_hops ?? 3, 5)));
    params.set("limit", String(Math.min(cmd.limit ?? 5, 50)));

    tc.add({ step: "fetchPaths", kind: "call", message: `GET /graph/paths from=${cmd.from} to=${cmd.to}` });

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
        meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
      }>(`/graph/paths?${params.toString()}`),
      getCachedGraphSchema(),
    ]);

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const { nodeColumns, nodes: nodesMap } = data.data;
    const typeIdx = nodeColumns.indexOf("type");
    const idIdx = nodeColumns.indexOf("id");
    const labelIdx = nodeColumns.indexOf("label");

    // Collect unique edge types used across all paths
    const usedEdgeTypes = new Set<string>();

    const paths = (data.data.paths ?? []).slice(0, cmd.limit ?? 5).map((p, idx) => {
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
      return emptyResult({
        reason: `No paths found between ${cmd.from} and ${cmd.to}`,
        tc,
        suggested_next: [
          { action: "Run", params: { command: "traverse", mode: "paths", max_hops: Math.min((cmd.max_hops ?? 3) + 1, 5) }, reason: "Increase max_hops to search deeper" },
          { action: "Run", params: { command: "explore", mode: "context" }, reason: "Check entity context to verify both entities exist" },
        ],
      });
    }

    // Build edge type annotations from schema using human-readable labels
    const edgeAnnotations: Record<string, { description: string }> = {};
    for (const et of usedEdgeTypes) {
      const schemaEntry = schema.edgeTypes.find((e) => e.edgeType === et);
      const label = humanEdgeLabel(et);
      if (schemaEntry?.description) {
        edgeAnnotations[label] = { description: schemaEntry.description };
      }
    }

    // Build enriched summary: base summary + edge type context (human-readable)
    const baseSummary = data.data.textSummary ?? `${paths.length} paths found`;
    const annotationLines = Object.entries(edgeAnnotations).map(
      ([label, { description }]) => `${label}: ${description}`,
    );
    const textSummary = annotationLines.length > 0
      ? `${baseSummary}\n\nRelationship types in these paths:\n${annotationLines.join("\n")}`
      : baseSummary;

    return okResult({
      text_summary: textSummary,
      data: {
        _method: "Shortest path search through the knowledge graph. Each path shows a chain of entities connected by typed relationships.",
        from: data.data.from,
        to: data.data.to,
        edgeAnnotations,
        paths,
      },
      state_delta: {},
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchError(err, tc);
  }
}
