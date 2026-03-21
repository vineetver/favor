/**
 * explore mode: compare — find shared neighbors via /graph/intersect,
 * or side-by-side Jaccard comparison via /graph/compare (same-type seeds).
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeedsWithMeta, resolveSeedsWithTypeHint, warnPartialResolution } from "../resolve-seeds";
import { errorResult, getCachedGraphSchema, trimEntitySubtitles, edgeTypeAnnotation, humanEdgeLabel } from "./graph";
import { okResult, catchToResult, TraceCollector } from "../run-result";
import { canonicalizeIntent, resolveIntentType, findEdgesConnecting, type GraphSchemaResponse } from "../intent-aliases";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreCompare(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    const { resolutions } = await resolveSeedsWithMeta(cmd.seeds, resolvedCache);
    let resolved = resolutions.map((r) => r.entity);
    warnPartialResolution(cmd.seeds.length, resolved.length, tc);
    if (resolved.length < 2) {
      return errorResult("compare mode requires at least 2 resolved entities.", tc);
    }

    let allSameType = resolved.every((e) => e.type === resolved[0].type);

    // Type correction: if seeds resolved to different types but we have
    // intent info, infer the expected seed type and re-resolve mismatches.
    if (!allSameType && cmd.into?.length) {
      const schema = await getCachedGraphSchema();
      const expectedSeedType = inferExpectedSeedType(schema, cmd.into, resolved);
      if (expectedSeedType) {
        tc.add({ step: "type_correction", kind: "decision", message: `Re-resolving seeds as ${expectedSeedType} (inferred from intents)` });
        const { resolutions: reResolved } = await resolveSeedsWithTypeHint(cmd.seeds, expectedSeedType, resolvedCache);
        const reEntities = reResolved.map((r) => r.entity);
        const nowSameType = reEntities.every((e) => e.type === reEntities[0].type);
        if (nowSameType) {
          resolved = reEntities;
          allSameType = true;
        } else {
          tc.warn("type_correction_failed", `Re-resolution produced mixed types: ${reEntities.map((e) => `${e.label}(${e.type})`).join(", ")}`);
        }
      } else {
        tc.warn("type_correction_skipped", `Could not infer expected seed type from intents: ${cmd.into.join(", ")}`);
      }
    }

    // Resolve edge types: explicit edge_type > into intents > unfiltered
    let edgeTypes: string[] | undefined;
    if (cmd.edge_type) {
      edgeTypes = [cmd.edge_type];
    } else if (cmd.into?.length) {
      const seedType = resolved[0].type;
      const schema = await getCachedGraphSchema();
      const resolved_edges: string[] = [];
      for (const rawIntent of cmd.into) {
        const [intent, repairNote] = canonicalizeIntent(rawIntent);
        if (repairNote) tc.warn("intent_repair", repairNote);
        const targetType = resolveIntentType(intent);
        if (!targetType) continue;
        const candidates = findEdgesConnecting(schema, seedType, targetType, intent);
        if (candidates.length > 0) {
          resolved_edges.push(candidates[0].edgeType);
        } else {
          tc.add({ step: `intent_${intent}`, kind: "decision", message: `No edge ${seedType}→${targetType} for compare` });
        }
      }
      if (resolved_edges.length > 0) edgeTypes = resolved_edges;
    }

    const edgeType = edgeTypes?.[0];
    const annotation = edgeType ? await edgeTypeAnnotation(edgeType) : null;

    if (allSameType) {
      return await executeCompare(resolved, edgeTypes, annotation, tc);
    }

    // Different types → fall back to /graph/intersect
    return await executeIntersect(resolved, edgeType, cmd.direction, cmd.limit, annotation, tc);
  } catch (err) {
    return catchToResult(err, tc);
  }
}

// ---------------------------------------------------------------------------
// /graph/compare — same-type Jaccard comparison
// ---------------------------------------------------------------------------

async function executeCompare(
  resolved: EntityRef[],
  edgeTypes: string[] | undefined,
  annotation: string | null,
  tc: TraceCollector,
): Promise<RunResult> {
  const filterLabel = edgeTypes?.length
    ? `filtered to ${edgeTypes.map(humanEdgeLabel).join(", ")}`
    : "all relationships";
  tc.add({ step: "routeCompare", kind: "decision", message: `Same-type seeds → /graph/compare (Jaccard), ${filterLabel}` });

  try {
    const data = await agentFetch<{
      data: {
        textSummary?: string;
        entities: Array<{ type: string; id: string; label: string }>;
        comparisons: Record<string, {
          label?: string;
          shared: Array<{ entity: { type: string; id: string; label: string }; score?: number }>;
          unique: Record<string, Array<{ entity: { type: string; id: string; label: string } }>>;
          counts: { shared: number; unique: Record<string, number> };
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
        ...(edgeTypes?.length ? { edgeTypes } : {}),
        limit: 20,
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
        _mode: "compare" as const,
        _method: "Side-by-side Jaccard comparison of same-type entities. Higher Jaccard index = more similar neighborhoods.",
        entities: resolved,
        relationship: edgeTypes?.length ? edgeTypes.map(humanEdgeLabel).join(", ") : "all relationships",
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
    return executeIntersect(resolved, edgeTypes?.[0], undefined, 20, annotation, tc);
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
        support: Array<{ from: { type: string; id: string; label: string }; edge: { type: string } }>;
      }>;
      counts: {
        shared?: number;
        limit?: number;
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
      _mode: "compare" as const,
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

// ---------------------------------------------------------------------------
// Infer expected seed type from intents + schema
// ---------------------------------------------------------------------------

/**
 * Given the target intents and the resolved seeds, figure out what type
 * the seeds SHOULD be. Strategy: for each intent, find the target type,
 * then find edges connecting to it. The "other side" of those edges
 * (not the target) is a candidate seed type. Return the most-common
 * candidate that appears among the resolved seeds.
 */
function inferExpectedSeedType(
  schema: GraphSchemaResponse,
  intents: string[],
  resolved: EntityRef[],
): string | null {
  const candidateCounts = new Map<string, number>();

  for (const rawIntent of intents) {
    const [intent] = canonicalizeIntent(rawIntent as import("../types").TargetIntent);
    const targetType = resolveIntentType(intent);
    if (!targetType) continue;

    // Find all edges that touch the target type
    for (const edge of schema.edgeTypes) {
      let otherSide: string | null = null;
      if (edge.fromType === targetType) otherSide = edge.toType;
      else if (edge.toType === targetType) otherSide = edge.fromType;
      if (!otherSide || otherSide === targetType) continue;
      candidateCounts.set(otherSide, (candidateCounts.get(otherSide) ?? 0) + 1);
    }
  }

  if (candidateCounts.size === 0) return null;

  // Among resolved seed types, pick the one that has the most edge connections
  // to our target types — prefer types that actually appear in the resolved set
  const seedTypes = new Set(resolved.map((e) => e.type));
  let best: string | null = null;
  let bestScore = -1;
  for (const [type, count] of candidateCounts) {
    const bonus = seedTypes.has(type) ? 100 : 0;
    if (count + bonus > bestScore) {
      bestScore = count + bonus;
      best = type;
    }
  }
  return best;
}

/** Extract entities from compare result data for pipeline forwarding. */
export function extractCompareEntities(data: Record<string, unknown>): EntityRef[] {
  const out: EntityRef[] = [];
  // Same-type compare: comparisons[edgeType].shared[].entity
  const comparisons = data.comparisons as Record<string, { shared?: unknown[] }> | undefined;
  if (comparisons) {
    for (const comp of Object.values(comparisons)) {
      for (const s of comp.shared ?? []) {
        const item = s as { entity?: Record<string, unknown> };
        const ent = item.entity;
        if (ent?.type && ent.id && ent.label) {
          out.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
        }
      }
    }
  }
  // Mixed-type compare: sharedNeighbors[].neighbor
  const sharedNeighbors = data.sharedNeighbors as Array<{ neighbor?: Record<string, unknown> }> | undefined;
  if (sharedNeighbors) {
    for (const s of sharedNeighbors) {
      const ent = s.neighbor;
      if (ent?.type && ent.id && ent.label) {
        out.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
      }
    }
  }
  return out;
}
