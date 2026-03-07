/**
 * explore mode: compare — find shared neighbors via /graph/intersect,
 * or side-by-side Jaccard comparison via /graph/compare (same-type seeds).
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError, trimEntitySubtitles, edgeTypeAnnotation, humanEdgeLabel } from "./graph";
import { okResult, TraceCollector } from "../run-result";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreCompare(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length < 2) {
      return errorResult("compare mode requires at least 2 resolved entities.", tc);
    }

    const edgeType = cmd.edge_type;
    const annotation = edgeType ? await edgeTypeAnnotation(edgeType) : null;

    // Route to /graph/compare for same-type seeds (Jaccard similarity)
    const allSameType = resolved.every((e) => e.type === resolved[0].type);

    if (allSameType) {
      return await executeCompare(resolved, edgeType, annotation, tc);
    }

    // Different types → fall back to /graph/intersect
    return await executeIntersect(resolved, edgeType, cmd.direction, cmd.limit, annotation, tc);
  } catch (err) {
    return catchError(err, tc);
  }
}

// ---------------------------------------------------------------------------
// /graph/compare — same-type Jaccard comparison
// ---------------------------------------------------------------------------

async function executeCompare(
  resolved: EntityRef[],
  edgeType: string | undefined,
  annotation: string | null,
  tc: TraceCollector,
): Promise<RunResult> {
  tc.add({ step: "routeCompare", kind: "decision", message: "Same-type seeds → /graph/compare (Jaccard)" });

  try {
    const data = await agentFetch<{
      data: {
        textSummary?: string;
        entities: Array<{ type: string; id: string; label: string }>;
        comparisons: Record<string, {
          label?: string;
          shared: Array<{ entity: { type: string; id: string; label: string }; score?: number }>;
          unique: Record<string, Array<{ entity: { type: string; id: string; label: string } }>>;
          counts: { shared: number; total: number };
        }>;
        overallSimilarity: {
          sharedNeighborCount: number;
          jaccardIndex: number;
        };
      };
      meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
    }>("/graph/compare", {
      method: "POST",
      body: {
        entities: resolved.map((e) => ({ type: e.type, id: e.id })),
        ...(edgeType ? { edgeTypes: [edgeType] } : {}),
        limit: 20,
        mode: "compact",
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);
    trimEntitySubtitles(resolved);

    const similarity = data.data?.overallSimilarity;
    const entityNames = resolved.map((e) => e.label).join(" vs ");
    const jaccard = similarity?.jaccardIndex != null
      ? ` (Jaccard: ${(similarity.jaccardIndex * 100).toFixed(1)}%)`
      : "";
    const sharedCount = similarity?.sharedNeighborCount ?? 0;

    const summary = data.data?.textSummary ??
      `Compared ${entityNames}: ${sharedCount} shared neighbors${jaccard}`;

    return okResult({
      text_summary: summary,
      data: {
        _method: "Side-by-side Jaccard comparison of same-type entities. Higher Jaccard index = more similar neighborhoods.",
        entities: resolved,
        relationship: edgeType ? humanEdgeLabel(edgeType) : "all relationships",
        edgeDescription: annotation ?? undefined,
        comparisons: data.data?.comparisons,
        overallSimilarity: similarity,
      },
      state_delta: { pinned_entities: resolved },
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    // Fallback to intersect if compare fails
    tc.add({ step: "compareFallback", kind: "fallback", message: "compare failed, falling back to intersect" });
    tc.warn("compare_fallback", "compare endpoint failed, using intersect instead");
    return executeIntersect(resolved, edgeType, undefined, 20, annotation, tc);
  }
}

// ---------------------------------------------------------------------------
// /graph/intersect — mixed-type shared neighbors
// ---------------------------------------------------------------------------

async function executeIntersect(
  resolved: EntityRef[],
  edgeType: string | undefined,
  direction: "in" | "out" | undefined,
  limit: number | undefined,
  annotation: string | null,
  tc: TraceCollector,
): Promise<RunResult> {
  tc.add({ step: "routeIntersect", kind: "decision", message: "Using /graph/intersect" });

  const data = await agentFetch<{
    data: {
      textSummary?: string;
      inputs: Array<{ type: string; id: string; label: string }>;
      intersectionType?: string;
      neighborType?: string;
      sharedNeighbors: Array<{
        neighbor: { type: string; id: string; label: string };
        support: string[];
      }>;
      counts: {
        sharedCount?: number;
        inputCount?: number;
      };
    };
    meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
  }>("/graph/intersect", {
    method: "POST",
    body: {
      entities: resolved.map((e) => ({ type: e.type, id: e.id })),
      edgeType,
      direction,
      limit: Math.min(limit ?? 20, 100),
      mode: "compact",
    },
  });

  tc.mergeApiWarnings(data.meta?.warnings);
  const resolvedInfo = tc.extractResolvedInfo(data.meta);

  const sharedNeighbors = data.data?.sharedNeighbors ?? [];
  trimEntitySubtitles(sharedNeighbors.map((s) => s.neighbor));

  const entityNames = resolved.map((e) => e.label).join(" vs ");
  const edgeLabel = edgeType ?? data.data?.intersectionType ?? "neighbors";
  const summary = data.data?.textSummary ??
    `Compared ${entityNames} via ${edgeLabel}: ${sharedNeighbors.length} shared neighbors`;

  return okResult({
    text_summary: summary,
    data: {
      entities: resolved,
      relationship: edgeType ? humanEdgeLabel(edgeType) : undefined,
      edgeDescription: annotation ?? undefined,
      sharedNeighbors,
      counts: data.data?.counts,
    },
    state_delta: { pinned_entities: resolved },
    tc,
    resolved_info: resolvedInfo,
  });
}
