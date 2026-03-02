/**
 * traverse mode: chain — multi-hop traversal with intent-first steps.
 *
 * Strategy: build a single /graph/query request with proper steps (including
 * branches when consecutive types lack a direct edge). Falls back to per-step
 * /graph/ranked-neighbors when the batch query fails.
 *
 * Phase 5: Full trace instrumentation — every decision/call/fallback recorded.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef, TraverseStep, TargetIntent } from "../types";
import {
  INTENT_TO_TYPE,
  findEdgesConnecting,
  type GraphSchemaResponse,
} from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import {
  getCachedGraphSchema,
  TARGET_EDGE_MAP,
  errorResult,
  catchError,
  edgeTypeAnnotation,
} from "./graph";
import { okResult, partialResult, TraceCollector } from "../run-result";

type TraverseCmd = Extract<RunCommand, { command: "traverse" }>;

/** Scored entity for chain results */
interface ScoredEntity extends EntityRef {
  rank?: number;
  score?: number;
}

/** Enriched entity for enrichment steps */
interface EnrichedEntity extends EntityRef {
  pValue?: number;
  foldEnrichment?: number;
  overlap?: number;
}

/** Unified step result used across all execution paths */
interface StepResult {
  step: number;
  intent: string;
  edgeType: string;
  edgeDescription?: string;
  scoreField?: string;
  entities: (ScoredEntity | EnrichedEntity)[];
}

/** Annotated "into" step with resolved source depth and edge type */
interface AnnotatedIntoStep {
  userStepIndex: number;
  intent: string;
  targetType: string;
  edgeType: string;
  defaultScoreField?: string;
  sourceDepth: number; // -1 if no edge found
  limit: number;
}

// ---------------------------------------------------------------------------
// Phase 1: Annotate steps — resolve edge types and detect backtrack points
// ---------------------------------------------------------------------------

function annotateIntoSteps(
  steps: TraverseStep[],
  seedType: string,
  schema: GraphSchemaResponse,
  tc: TraceCollector,
): { intoSteps: AnnotatedIntoStep[]; enrichIndices: number[] } {
  const typeStack: string[] = [seedType];
  const intoSteps: AnnotatedIntoStep[] = [];
  const enrichIndices: number[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if ("into" in step) {
      const targetType = INTENT_TO_TYPE[step.into];
      if (!targetType) {
        tc.warn("unknown_intent", `Step ${i}: unknown intent "${step.into}"`);
        continue;
      }

      let found = false;
      for (let d = typeStack.length - 1; d >= 0; d--) {
        const edges = findEdgesConnecting(schema, typeStack[d], targetType);
        if (edges.length > 0) {
          const ann: AnnotatedIntoStep = {
            userStepIndex: i,
            intent: step.into,
            targetType,
            edgeType: edges[0].edgeType,
            defaultScoreField: edges[0].defaultScoreField,
            sourceDepth: d,
            limit: Math.min(step.top ?? 20, 100),
          };
          intoSteps.push(ann);

          tc.add({
            step: `annotateStep_${i}`,
            kind: "decision",
            message: `${step.into}: ${typeStack[d]}→${targetType} via ${edges[0].edgeType} (depth=${d})`,
          });

          if (d === typeStack.length - 1) {
            typeStack.push(targetType);
          }
          found = true;
          break;
        }
      }

      if (!found) {
        tc.warn("no_edge", `Step ${i}: no edge ${typeStack.at(-1)}→${targetType}`);
        intoSteps.push({
          userStepIndex: i,
          intent: step.into,
          targetType,
          edgeType: "none",
          sourceDepth: -1,
          limit: step.top ?? 20,
        });
      }
    } else if ("enrich" in step) {
      enrichIndices.push(i);
      tc.add({ step: `annotateStep_${i}`, kind: "decision", message: `enrich: ${step.enrich}` });
    }
  }

  return { intoSteps, enrichIndices };
}

// ---------------------------------------------------------------------------
// Phase 2: Build /graph/query steps from annotated into steps
// ---------------------------------------------------------------------------

function buildQuerySteps(
  intoSteps: AnnotatedIntoStep[],
): Array<Record<string, unknown>> {
  const valid = intoSteps.filter((s) => s.sourceDepth >= 0);
  if (valid.length === 0) return [];

  const byDepth = new Map<number, AnnotatedIntoStep[]>();
  for (const s of valid) {
    const group = byDepth.get(s.sourceDepth) ?? [];
    group.push(s);
    byDepth.set(s.sourceDepth, group);
  }

  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
  const querySteps: Array<Record<string, unknown>> = [];

  for (const depth of sortedDepths) {
    const group = byDepth.get(depth)!;
    if (group.length === 1) {
      const s = group[0];
      querySteps.push({
        edgeTypes: [s.edgeType],
        limit: s.limit,
        sort: s.defaultScoreField ? `-${s.defaultScoreField}` : undefined,
      });
    } else {
      querySteps.push({
        branch: group.map((s) => ({
          edgeTypes: [s.edgeType],
          limit: s.limit,
          sort: s.defaultScoreField ? `-${s.defaultScoreField}` : undefined,
        })),
      });
    }
  }

  return querySteps;
}

// ---------------------------------------------------------------------------
// Phase 3a: Execute via /graph/query (batch)
// ---------------------------------------------------------------------------

async function executeViaQuery(
  seed: EntityRef,
  intoSteps: AnnotatedIntoStep[],
  tc: TraceCollector,
): Promise<StepResult[] | null> {
  const querySteps = buildQuerySteps(intoSteps);
  if (querySteps.length === 0) return null;

  try {
    tc.add({ step: "batchQuery", kind: "call", message: `POST /graph/query with ${querySteps.length} steps` });

    const resp = await agentFetch<{
      data: {
        nodes: Record<
          string,
          { entity: EntityRef; fields?: Record<string, unknown> }
        >;
        edges: Array<{
          type: string;
          from: string;
          to: string;
          fields?: Record<string, unknown>;
        }>;
      };
      meta?: { nodeCount?: number; edgeCount?: number; warnings?: unknown[] };
    }>("/graph/query", {
      method: "POST",
      body: {
        seeds: [{ type: seed.type, id: seed.id }],
        steps: querySteps,
        select: {
          nodeFields: ["label", "subtitle"].slice(0, 20),
          edgeFields: [
            "score",
            "overall_score",
            "combined_score",
          ].slice(0, 20),
        },
        limits: { maxNodes: 1000, maxEdges: 5000 },
      },
    });

    tc.mergeApiWarnings(resp.meta?.warnings);
    tc.add({
      step: "batchQueryResult",
      kind: "timing",
      message: `Got ${resp.meta?.nodeCount ?? 0} nodes, ${resp.meta?.edgeCount ?? 0} edges`,
    });

    const nodes = resp.data?.nodes ?? {};
    const edges = resp.data?.edges ?? [];

    const results: StepResult[] = [];
    for (const ann of intoSteps) {
      if (ann.edgeType === "none") {
        results.push({
          step: ann.userStepIndex,
          intent: ann.intent,
          edgeType: "none",
          entities: [],
        });
        continue;
      }

      const stepEdges = edges.filter((e) => e.type === ann.edgeType);
      const targetEntities: ScoredEntity[] = [];
      const seen = new Set<string>();

      for (const edge of stepEdges) {
        const fromType = edge.from.split(":")[0];
        const toType = edge.to.split(":")[0];
        const targetKey =
          toType === ann.targetType
            ? edge.to
            : fromType === ann.targetType
              ? edge.from
              : null;

        if (!targetKey || seen.has(targetKey)) continue;
        seen.add(targetKey);

        const node = nodes[targetKey];
        if (!node?.entity) continue;

        const score = (edge.fields?.overall_score ??
          edge.fields?.score ??
          edge.fields?.combined_score) as number | undefined;

        targetEntities.push({
          ...node.entity,
          rank: targetEntities.length + 1,
          score: typeof score === "number" ? score : undefined,
        });
      }

      const annotation = await edgeTypeAnnotation(ann.edgeType);
      results.push({
        step: ann.userStepIndex,
        intent: ann.intent,
        edgeType: ann.edgeType,
        edgeDescription: annotation ?? undefined,
        scoreField: ann.defaultScoreField,
        entities: targetEntities.slice(0, ann.limit),
      });
    }

    return results;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    tc.add({ step: "batchQueryFailed", kind: "fallback", message: `Query failed: ${msg}` });
    tc.warn("batch_query_failed", `Batch query failed, falling back to per-step: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 3b: Fallback — per-step ranked-neighbors
// ---------------------------------------------------------------------------

async function executePerStep(
  seed: EntityRef,
  intoSteps: AnnotatedIntoStep[],
  tc: TraceCollector,
): Promise<StepResult[]> {
  tc.add({ step: "perStepFallback", kind: "fallback", message: `Executing ${intoSteps.length} steps individually` });

  const results: StepResult[] = [];
  const entitiesAtDepth = new Map<number, EntityRef[]>();
  entitiesAtDepth.set(0, [seed]);

  for (const ann of intoSteps) {
    if (ann.edgeType === "none") {
      results.push({
        step: ann.userStepIndex,
        intent: ann.intent,
        edgeType: "none",
        entities: [],
      });
      continue;
    }

    const stepSeeds = (entitiesAtDepth.get(ann.sourceDepth) ?? [seed]).slice(0, 10);
    const annotation = await edgeTypeAnnotation(ann.edgeType);

    try {
      tc.add({ step: `perStep_${ann.userStepIndex}`, kind: "call", message: `ranked-neighbors: ${ann.edgeType}` });

      const data = await agentFetch<{
        data: {
          neighbors: Array<{
            entity: EntityRef;
            rank: number;
            score?: number;
          }>;
        };
        meta?: { resolved?: { scoreField?: string }; warnings?: unknown[] };
      }>("/graph/ranked-neighbors", {
        method: "POST",
        body: {
          seed: { type: stepSeeds[0].type, id: stepSeeds[0].id },
          edgeType: ann.edgeType,
          limit: ann.limit,
        },
      });

      tc.mergeApiWarnings(data.meta?.warnings);

      const entities: ScoredEntity[] = (data.data?.neighbors ?? []).map(
        (n) => ({
          ...n.entity,
          rank: n.rank,
          score: n.score,
        }),
      );

      const resultDepth = ann.sourceDepth + 1;
      if (!entitiesAtDepth.has(resultDepth)) {
        entitiesAtDepth.set(resultDepth, entities);
      }

      results.push({
        step: ann.userStepIndex,
        intent: ann.intent,
        edgeType: ann.edgeType,
        edgeDescription: annotation ?? undefined,
        scoreField: data.meta?.resolved?.scoreField ?? ann.defaultScoreField,
        entities,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      tc.warn("step_failed", `Step ${ann.userStepIndex} (${ann.intent}): ${msg}`);
      results.push({
        step: ann.userStepIndex,
        intent: ann.intent,
        edgeType: ann.edgeType,
        edgeDescription: annotation ?? undefined,
        entities: [],
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Enrichment step execution
// ---------------------------------------------------------------------------

async function executeEnrichStep(
  step: Extract<TraverseStep, { enrich: string }>,
  userStepIndex: number,
  inputEntities: EntityRef[],
  tc: TraceCollector,
): Promise<StepResult | null> {
  const targetType = INTENT_TO_TYPE[step.enrich];
  if (!targetType) return null;

  if (inputEntities.length < 3) {
    tc.add({
      step: `enrich_${userStepIndex}`,
      kind: "decision",
      message: `Only ${inputEntities.length} entities — too few for enrichment, will fallback`,
    });
    return null;
  }

  const inputType = inputEntities[0].type;
  let expectedEdge: string | undefined;

  const schema = await getCachedGraphSchema();
  const dynamicEdges = findEdgesConnecting(schema, inputType, targetType);
  if (dynamicEdges.length > 0) {
    expectedEdge = dynamicEdges[0].edgeType;
    tc.add({ step: `enrich_${userStepIndex}`, kind: "decision", message: `Schema edge: ${expectedEdge}` });
  } else {
    expectedEdge = TARGET_EDGE_MAP[targetType];
    tc.add({ step: `enrich_${userStepIndex}`, kind: "fallback", message: `Static map fallback: ${expectedEdge}` });
  }

  if (!expectedEdge) return null;

  const annotation = await edgeTypeAnnotation(expectedEdge);

  tc.add({ step: `enrich_${userStepIndex}`, kind: "call", message: `POST /graph/enrichment` });

  const data = await agentFetch<{
    data: {
      enriched: Array<{
        entity: EntityRef;
        overlap: number;
        pValue: number;
        adjustedPValue: number;
        foldEnrichment: number;
      }>;
    };
    meta?: { warnings?: unknown[] };
  }>("/graph/enrichment", {
    method: "POST",
    body: {
      inputSet: inputEntities
        .slice(0, 50)
        .map((e) => ({ type: e.type, id: e.id })),
      targetType,
      edgeType: expectedEdge,
      pValueCutoff: step.p_cutoff ?? 0.05,
      limit: step.top ?? 20,
    },
  });

  tc.mergeApiWarnings(data.meta?.warnings);

  const entities: EnrichedEntity[] = (data.data?.enriched ?? []).map((e) => ({
    ...e.entity,
    pValue: e.pValue,
    foldEnrichment: e.foldEnrichment,
    overlap: e.overlap,
  }));

  return {
    step: userStepIndex,
    intent: step.enrich,
    edgeType: expectedEdge,
    edgeDescription: annotation ?? undefined,
    scoreField: "Fisher's exact test p-value",
    entities,
  };
}

// ---------------------------------------------------------------------------
// Fallback: enrich → connectivity when input set is too small
// ---------------------------------------------------------------------------

async function executeFallbackInto(
  intent: TargetIntent,
  userStepIndex: number,
  inputEntities: EntityRef[],
  schema: GraphSchemaResponse,
  limit: number,
  tc: TraceCollector,
): Promise<StepResult | null> {
  const targetType = INTENT_TO_TYPE[intent];
  if (!targetType) return null;

  const inputType = inputEntities[0].type;
  const edges = findEdgesConnecting(schema, inputType, targetType);
  if (edges.length === 0) return null;

  const edgeInfo = edges[0];
  const annotation = await edgeTypeAnnotation(edgeInfo.edgeType);

  try {
    tc.add({
      step: `enrichFallback_${userStepIndex}`,
      kind: "fallback",
      message: `Enrichment unavailable, using ranked-neighbors: ${edgeInfo.edgeType}`,
    });

    const data = await agentFetch<{
      data: {
        neighbors: Array<{
          entity: EntityRef;
          rank: number;
          score?: number;
        }>;
      };
      meta?: { resolved?: { scoreField?: string }; warnings?: unknown[] };
    }>("/graph/ranked-neighbors", {
      method: "POST",
      body: {
        seed: { type: inputEntities[0].type, id: inputEntities[0].id },
        edgeType: edgeInfo.edgeType,
        limit: Math.min(limit, 100),
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);

    const entities: ScoredEntity[] = (data.data?.neighbors ?? []).map(
      (n) => ({
        ...n.entity,
        rank: n.rank,
        score: n.score,
      }),
    );

    return {
      step: userStepIndex,
      intent,
      edgeType: edgeInfo.edgeType,
      edgeDescription: annotation ?? undefined,
      scoreField:
        data.meta?.resolved?.scoreField ?? edgeInfo.defaultScoreField,
      entities,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    tc.warn("fallback_failed", `Enrichment fallback ${userStepIndex}: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleTraverseChain(
  cmd: TraverseCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.seed) return errorResult("chain mode requires a 'seed' entity.", tc);
    if (!cmd.steps?.length)
      return errorResult("chain mode requires at least one step.", tc);

    const resolvedSeeds = await resolveSeeds([cmd.seed], resolvedCache);
    if (!resolvedSeeds.length)
      return errorResult("Could not resolve seed entity.", tc);

    const seed = resolvedSeeds[0];
    const schema = await getCachedGraphSchema();

    // Phase 1: Annotate steps — resolve edges and detect backtracks
    tc.add({ step: "annotateSteps", kind: "decision", message: `Annotating ${cmd.steps.length} steps from ${seed.type}` });
    const { intoSteps, enrichIndices } = annotateIntoSteps(
      cmd.steps,
      seed.type,
      schema,
      tc,
    );

    // Phase 2+3: Execute into steps via batch query, fall back to per-step
    const intoResults =
      (await executeViaQuery(seed, intoSteps, tc)) ??
      (await executePerStep(seed, intoSteps, tc));

    // Phase 4: Execute enrich steps (with auto-fallback to connectivity)
    const enrichResults: StepResult[] = [];
    for (const idx of enrichIndices) {
      const step = cmd.steps[idx] as Extract<TraverseStep, { enrich: string }>;

      const allSoFar = [...intoResults, ...enrichResults].sort(
        (a, b) => a.step - b.step,
      );
      const prevStep = allSoFar
        .filter((r) => r.step < idx && r.entities.length > 0)
        .at(-1);
      const inputEntities = prevStep?.entities.length
        ? prevStep.entities
        : [seed];

      let result = await executeEnrichStep(step, idx, inputEntities, tc);

      if (!result) {
        result = await executeFallbackInto(
          step.enrich,
          idx,
          inputEntities,
          schema,
          step.top ?? 20,
          tc,
        );
      }

      if (result) enrichResults.push(result);
    }

    // Merge and sort by user step index
    const allResults = [...intoResults, ...enrichResults].sort(
      (a, b) => a.step - b.step,
    );

    // Build informative summary with edge context
    const stepSummaries = allResults.map((r) => {
      const scoreInfo = r.scoreField ? ` ranked by ${r.scoreField}` : "";
      return `Step ${r.step + 1} → ${r.entities.length} ${r.intent} via ${r.edgeType}${scoreInfo}`;
    });

    // Determine if any steps failed
    const failedSteps = allResults.filter((r) => r.entities.length === 0);
    const hasPartialFailure = failedSteps.length > 0 && allResults.some((r) => r.entities.length > 0);

    const resultFn = hasPartialFailure ? partialResult : okResult;

    return resultFn({
      text_summary: `Traversal from ${seed.label}:\n${stepSummaries.join("\n")}`,
      data: {
        seed,
        steps: allResults.map((r) => ({
          intent: r.intent,
          edgeType: r.edgeType,
          edgeDescription: r.edgeDescription,
          scoreField: r.scoreField,
          count: r.entities.length,
          top: r.entities.slice(0, 10),
        })),
      },
      state_delta: { pinned_entities: [seed] },
      tc,
    });
  } catch (err) {
    return catchError(err, tc);
  }
}
