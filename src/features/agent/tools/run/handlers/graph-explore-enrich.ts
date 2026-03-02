/**
 * explore mode: enrich — statistical over-representation test via /graph/enrichment.
 *
 * M8: Generic enrichment — not Gene-only.
 * Primary: findEdgesConnecting(schema, inputType, targetType)
 * Fallback: TARGET_EDGE_MAP only if schema inference fails
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { INTENT_TO_TYPE, findEdgesConnecting } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { TARGET_EDGE_MAP, getCachedGraphSchema, errorResult, catchError, trimEntitySubtitles, edgeTypeAnnotation } from "./graph";
import { okResult, TraceCollector } from "../run-result";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreEnrich(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.target) {
      return errorResult("enrich mode requires a 'target' intent (e.g. pathways, diseases).", tc);
    }

    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length < 3) {
      return errorResult("Enrichment requires at least 3 resolved entities.", tc);
    }

    const targetType = INTENT_TO_TYPE[cmd.target];
    if (!targetType) {
      return errorResult(`Unknown target intent: ${cmd.target}`, tc);
    }

    // M8: Generic edge resolution — try schema first, fall back to static map
    const inputType = resolved[0].type;
    let expectedEdge: string | undefined;
    let edgeStrategy: string;

    const schema = await getCachedGraphSchema();
    const dynamicEdges = findEdgesConnecting(schema, inputType, targetType);

    if (dynamicEdges.length > 0) {
      expectedEdge = dynamicEdges[0].edgeType;
      edgeStrategy = "schema_inference";
      tc.add({
        step: "resolveEdge",
        kind: "decision",
        message: `Schema: ${inputType}→${targetType} via ${expectedEdge}`,
      });
    } else {
      expectedEdge = TARGET_EDGE_MAP[targetType];
      edgeStrategy = "static_fallback";
      tc.add({
        step: "resolveEdge",
        kind: "fallback",
        message: `No schema edge ${inputType}→${targetType}; using static map: ${expectedEdge ?? "none"}`,
      });
    }

    if (!expectedEdge) {
      return errorResult(
        `No enrichment edge type connecting ${inputType} to ${targetType}. ` +
        `Enrichment requires a direct edge between your input entity type and the target type.`,
        tc,
      );
    }

    const annotation = await edgeTypeAnnotation(expectedEdge);

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        inputSize: number;
        backgroundSize: number;
        targetType: string;
        edgeType: string;
        method?: string;
        correction?: string;
        enriched: Array<{
          entity: EntityRef;
          overlap: number;
          targetSize?: number;
          pValue: number;
          adjustedPValue: number;
          foldEnrichment: number;
          overlappingEntities?: Array<{ type: string; id: string; label: string }>;
        }>;
      };
      meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
    }>("/graph/enrichment", {
      method: "POST",
      body: {
        inputSet: resolved.map((e) => ({ type: e.type, id: e.id })),
        targetType,
        edgeType: expectedEdge,
        pValueCutoff: cmd.p_cutoff ?? 0.05,
        limit: Math.min(cmd.limit ?? 20, 50),
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const rawEnriched = data.data?.enriched ?? [];
    trimEntitySubtitles(rawEnriched);
    const enriched = rawEnriched.slice(0, 20).map((e) => ({
      entity: e.entity,
      overlap: e.overlap,
      pValue: e.pValue,
      adjustedPValue: e.adjustedPValue,
      foldEnrichment: e.foldEnrichment,
      overlappingEntities: e.overlappingEntities?.map((oe) => oe.label) ?? [],
    }));

    if (enriched.length === 0) {
      return errorResult(`No significant enrichment found (p < ${cmd.p_cutoff ?? 0.05})`, tc);
    }

    const pCutoff = cmd.p_cutoff ?? 0.05;
    const method = data.data?.method ?? "Fisher's exact test";
    const summary = data.data?.textSummary ??
      `${enriched.length} enriched ${cmd.target} (${method}, p < ${pCutoff})`;

    return okResult({
      text_summary: summary,
      data: {
        _method: `${method} — tests whether your ${resolved.length} input ${inputType}s are over-represented in each ${targetType} compared to the background (${data.data.backgroundSize} entities). Low p-values indicate statistically significant enrichment.`,
        edgeType: expectedEdge,
        edgeDescription: annotation ?? undefined,
        edgeStrategy,
        inputType,
        inputSize: data.data.inputSize,
        backgroundSize: data.data.backgroundSize,
        enriched,
      },
      state_delta: {},
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchError(err, tc);
  }
}
