/**
 * traverse mode: paths — shortest paths between two entities via /graph/paths,
 * with optional edge detail enrichment via /graph/connections.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchError } from "./graph";

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

    const data = await agentFetch<{
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
    }>(`/graph/paths?${params.toString()}`);

    const { nodeColumns, nodes: nodesMap } = data.data;
    const typeIdx = nodeColumns.indexOf("type");
    const idIdx = nodeColumns.indexOf("id");
    const labelIdx = nodeColumns.indexOf("label");

    const paths = (data.data.paths ?? []).slice(0, cmd.limit ?? 5).map((p, idx) => ({
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
    }));

    if (paths.length === 0) {
      return errorResult(`No paths found between ${cmd.from} and ${cmd.to}`);
    }

    // Optional: enrich with edge details via /graph/connections
    let edgeDetails: unknown = undefined;
    if (cmd.include_edge_detail && paths.length > 0) {
      try {
        // Collect unique node pairs from paths for connections lookup
        const pairs: Array<{ from: string; to: string }> = [];
        for (const path of paths) {
          for (let i = 0; i < path.nodes.length - 1; i++) {
            const fromNode = path.nodes[i];
            const toNode = path.nodes[i + 1];
            if (fromNode && toNode) {
              pairs.push({
                from: `${fromNode.type}:${fromNode.id}`,
                to: `${toNode.type}:${toNode.id}`,
              });
            }
          }
        }

        if (pairs.length > 0) {
          const connData = await agentFetch<{
            data: { connections: unknown };
          }>("/graph/connections", {
            method: "POST",
            body: { pairs: pairs.slice(0, 50) },
          });
          edgeDetails = connData.data?.connections;
        }
      } catch {
        // Non-critical — return paths without edge detail
      }
    }

    return {
      text_summary: data.data.textSummary ?? `${paths.length} paths found`,
      data: {
        from: data.data.from,
        to: data.data.to,
        paths,
        ...(edgeDetails ? { edgeDetails } : {}),
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}
