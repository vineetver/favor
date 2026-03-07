/**
 * Pipeline handler — multi-step Run execution with dependency tracking.
 *
 * Validates structure, topologically sorts by dependencies, executes waves
 * in parallel, and forwards entities between graph steps via seeds_from.
 *
 * executeRun is injected as a parameter to avoid circular imports.
 */

import type { RunCommand, PipelineStep, EntityRef } from "../types";
import type { RunContext } from "../index";
import type { RunResultEnvelope } from "../run-result";
import { errorResult, okResult, partialResult, TraceCollector } from "../run-result";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExecFn = (command: Record<string, unknown>, ctx: RunContext) => Promise<RunResultEnvelope>;

interface StepResult {
  id: string;
  command: string;
  status: "ok" | "empty" | "error" | "skipped";
  summary: string;
  data?: Record<string, unknown>;
  entities?: EntityRef[];
  entities_meta?: { totalAvailable: number; capped: boolean; warning?: string };
  skip_reason?: string;
  ms?: number;
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// ---------------------------------------------------------------------------

export function topoSort(steps: PipelineStep[]): PipelineStep[][] {
  const idToStep = new Map(steps.map((s) => [s.id, s]));

  // Build adjacency: edges from dependency → dependent
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const s of steps) {
    inDegree.set(s.id, 0);
    dependents.set(s.id, []);
  }

  for (const s of steps) {
    const deps = new Set<string>();
    if (s.depends_on) {
      for (const d of s.depends_on) deps.add(d);
    }
    // seeds_from implies a dependency
    if (s.seeds_from) deps.add(s.seeds_from);

    inDegree.set(s.id, deps.size);
    for (const d of deps) {
      const list = dependents.get(d);
      if (list) list.push(s.id);
    }
  }

  const waves: PipelineStep[][] = [];
  const remaining = new Set(steps.map((s) => s.id));

  while (remaining.size > 0) {
    const wave: PipelineStep[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) ?? 0) === 0) {
        wave.push(idToStep.get(id)!);
      }
    }

    if (wave.length === 0) {
      throw new Error("Circular dependency detected in pipeline steps");
    }

    for (const s of wave) {
      remaining.delete(s.id);
      for (const depId of dependents.get(s.id) ?? []) {
        inDegree.set(depId, (inDegree.get(depId) ?? 1) - 1);
      }
    }

    waves.push(wave);
  }

  return waves;
}

// ---------------------------------------------------------------------------
// Entity extraction from step results
// ---------------------------------------------------------------------------

function extractEntities(
  result: RunResultEnvelope,
  command: string,
  nextStep?: PipelineStep,
): { entities: EntityRef[]; meta?: StepResult["entities_meta"] } {
  const data = result.data;
  if (!data) return { entities: [] };

  let raw: EntityRef[] = [];

  switch (command) {
    case "explore": {
      // From results[key].top[] (neighbor entities)
      const results = data.results as Record<string, { top?: unknown[] }> | undefined;
      if (results) {
        for (const branch of Object.values(results)) {
          for (const e of branch.top ?? []) {
            const ent = e as Record<string, unknown>;
            if (ent.type && ent.id && ent.label) {
              raw.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
            }
          }
        }
      }
      break;
    }
    case "traverse": {
      // From last non-empty steps[].top[]
      const steps = data.steps as Array<{ top?: unknown[] }> | undefined;
      if (steps) {
        for (let i = steps.length - 1; i >= 0; i--) {
          const top = steps[i].top;
          if (top && top.length > 0) {
            for (const e of top) {
              const ent = e as Record<string, unknown>;
              if (ent.type && ent.id && ent.label) {
                raw.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
              }
            }
            break;
          }
        }
      }
      break;
    }
    case "query": {
      // From matches[].vars (all bound entities)
      const matches = data.matches as Array<{ vars?: Record<string, unknown> }> | undefined;
      if (matches) {
        for (const m of matches) {
          if (m.vars) {
            for (const v of Object.values(m.vars)) {
              const ent = v as Record<string, unknown>;
              if (ent.type && ent.id && ent.label) {
                raw.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
              }
            }
          }
        }
      }
      break;
    }
    case "variant_profile": {
      // From profiles[] (resolved variant refs)
      const profiles = data.profiles as Array<Record<string, unknown>> | undefined;
      if (profiles) {
        for (const p of profiles) {
          if (p.type && p.id && p.label) {
            raw.push({ type: String(p.type), id: String(p.id), label: String(p.label) });
          }
        }
      }
      break;
    }
    default:
      // Cohort commands: no graph entities (v1 is graph-to-graph only)
      return { entities: [] };
  }

  // Deduplicate by id
  const seen = new Set<string>();
  raw = raw.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Adaptive limit based on next step's mode
  const isEnrichment =
    nextStep?.command === "explore" &&
    ((nextStep.args as Record<string, unknown>).mode === "enrich" ||
      JSON.stringify(nextStep.args).includes("enrich"));
  const cap = isEnrichment ? 50 : 10;

  const totalAvailable = raw.length;
  const capped = raw.length > cap;
  const entities = raw.slice(0, cap);

  const meta: StepResult["entities_meta"] = capped
    ? { totalAvailable, capped: true, warning: `Capped to ${cap} of ${totalAvailable} entities` }
    : { totalAvailable, capped: false };

  return { entities, meta };
}

// ---------------------------------------------------------------------------
// Build flat command for a sub-step
// ---------------------------------------------------------------------------

function buildStepCommand(
  step: PipelineStep,
  seedEntities?: EntityRef[],
): Record<string, unknown> {
  const cmd: Record<string, unknown> = { command: step.command, ...step.args };

  if (seedEntities?.length) {
    const seedRefs = seedEntities.map((e) => ({ type: e.type, id: e.id, label: e.label }));
    if (step.command === "traverse") {
      // traverse chain uses singular `seed`
      cmd.seed = seedRefs[0];
    } else {
      // explore, query use `seeds` array
      cmd.seeds = seedRefs;
    }
  }

  return cmd;
}

// ---------------------------------------------------------------------------
// Failure cascading
// ---------------------------------------------------------------------------

function shouldSkipDependent(
  failedResult: RunResultEnvelope,
  failedStep: PipelineStep,
  dependentStep: PipelineStep,
  stepEntities: Map<string, EntityRef[]>,
): "skip" | "execute_without_seeds" | "execute_with_partial" {
  // If dependent uses seeds_from the failed step
  if (dependentStep.seeds_from === failedStep.id) {
    const entities = stepEntities.get(failedStep.id) ?? [];
    if (failedResult.status === "partial" && entities.length > 0) {
      return "execute_with_partial";
    }
    return "skip";
  }

  // depends_on only (ordering dependency, no seeds_from)
  if (failedStep.command === "set_cohort") return "skip"; // cohort state broken
  return "execute_without_seeds";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handlePipeline(
  cmd: Extract<RunCommand, { command: "pipeline" }>,
  ctx: RunContext,
  execFn: ExecFn,
): Promise<RunResultEnvelope> {
  const tc = new TraceCollector();
  const { goal, plan_steps: steps } = cmd;

  // --- Validate structure ---

  // No nested pipelines
  if (steps.some((s) => s.command === "pipeline")) {
    return errorResult({
      message: "Nested pipelines are not allowed.",
      code: "validation_error",
      tc,
    });
  }

  // Unique step IDs
  const ids = new Set(steps.map((s) => s.id));
  if (ids.size !== steps.length) {
    return errorResult({
      message: "Duplicate step IDs in pipeline.",
      code: "validation_error",
      tc,
    });
  }

  // Validate dependency references
  for (const s of steps) {
    for (const dep of s.depends_on ?? []) {
      if (!ids.has(dep)) {
        return errorResult({
          message: `Step "${s.id}" depends_on unknown step "${dep}".`,
          code: "validation_error",
          tc,
        });
      }
    }
    if (s.seeds_from && !ids.has(s.seeds_from)) {
      return errorResult({
        message: `Step "${s.id}" seeds_from unknown step "${s.seeds_from}".`,
        code: "validation_error",
        tc,
      });
    }
  }

  // Must have at least one dependency — otherwise just call commands separately
  const hasDependency = steps.some(
    (s) => (s.depends_on && s.depends_on.length > 0) || s.seeds_from,
  );
  if (!hasDependency) {
    return errorResult({
      message: "Pipeline steps have no dependencies. Call commands separately instead.",
      code: "validation_error",
      hint: "Pipeline requires at least one step with depends_on or seeds_from.",
      tc,
    });
  }

  // --- Topological sort ---
  let waves: PipelineStep[][];
  try {
    waves = topoSort(steps);
  } catch (err) {
    return errorResult({
      message: err instanceof Error ? err.message : "Cycle in pipeline dependencies",
      code: "validation_error",
      tc,
    });
  }

  tc.add({ step: "topo_sort", kind: "decision", message: `${waves.length} waves, ${steps.length} steps` });

  // --- Execute waves ---
  const stepResults = new Map<string, StepResult>();
  const stepRawResults = new Map<string, RunResultEnvelope>();
  const stepEntities = new Map<string, EntityRef[]>();
  // Mutable copy of context so cohort ID changes propagate
  const pipeCtx: RunContext = { ...ctx };

  for (const wave of waves) {
    const waveStart = Date.now();

    const promises = wave.map(async (step): Promise<void> => {
      const stepStart = Date.now();

      // Check if any dependency failed
      const allDeps = new Set<string>();
      if (step.depends_on) for (const d of step.depends_on) allDeps.add(d);
      if (step.seeds_from) allDeps.add(step.seeds_from);

      for (const depId of allDeps) {
        const depResult = stepRawResults.get(depId);
        const depStepDef = steps.find((s) => s.id === depId);
        if (depResult && depResult.status === "error" && depStepDef) {
          const decision = shouldSkipDependent(depResult, depStepDef, step, stepEntities);
          if (decision === "skip") {
            stepResults.set(step.id, {
              id: step.id,
              command: step.command,
              status: "skipped",
              summary: `Skipped: dependency "${depId}" failed`,
              skip_reason: `Dependency "${depId}" failed`,
              ms: Date.now() - stepStart,
            });
            return;
          }
          // execute_without_seeds or execute_with_partial: fall through
        }
      }

      // Extract seeds if seeds_from
      let seedEntities: EntityRef[] | undefined;
      if (step.seeds_from) {
        seedEntities = stepEntities.get(step.seeds_from);
        if (!seedEntities || seedEntities.length === 0) {
          // Check if the source step was partial — might still have some entities
          const sourceResult = stepRawResults.get(step.seeds_from);
          if (!sourceResult || sourceResult.status === "error") {
            stepResults.set(step.id, {
              id: step.id,
              command: step.command,
              status: "skipped",
              summary: `Skipped: no entities from "${step.seeds_from}"`,
              skip_reason: `seeds_from "${step.seeds_from}" produced no entities`,
              ms: Date.now() - stepStart,
            });
            return;
          }
        }
      }

      // Build and execute
      const flatCmd = buildStepCommand(step, seedEntities);
      const result = await execFn(flatCmd, pipeCtx);

      stepRawResults.set(step.id, result);

      // Extract entities for downstream steps
      const { entities, meta } = extractEntities(result, step.command, steps.find((s) => s.seeds_from === step.id));
      stepEntities.set(step.id, entities);

      // Propagate cohort ID changes
      if (result.state_delta?.active_cohort_id) {
        pipeCtx.activeCohortId = result.state_delta.active_cohort_id;
      }

      const sr: StepResult = {
        id: step.id,
        command: step.command,
        status: result.status === "ok" || result.status === "partial" ? "ok"
          : result.status === "empty" ? "empty"
          : "error",
        summary: result.text_summary ?? "",
        data: result.data,
        ms: Date.now() - stepStart,
      };
      if (entities.length > 0) sr.entities = entities;
      if (meta) sr.entities_meta = meta;

      stepResults.set(step.id, sr);
    });

    await Promise.allSettled(promises);

    tc.add({
      step: `wave`,
      kind: "timing",
      ms: Date.now() - waveStart,
      message: `${wave.map((s) => s.id).join(",")}`,
    });
  }

  // --- Merge state_delta in topo order ---
  const mergedDelta: RunResultEnvelope["state_delta"] = {};
  for (const wave of waves) {
    for (const step of wave) {
      const raw = stepRawResults.get(step.id);
      if (!raw?.state_delta) continue;
      const d = raw.state_delta;
      if (d.active_cohort_id) mergedDelta.active_cohort_id = d.active_cohort_id;
      if (d.new_artifact_ids?.length) {
        mergedDelta.new_artifact_ids = [...(mergedDelta.new_artifact_ids ?? []), ...d.new_artifact_ids];
      }
      if (d.pinned_entities?.length) {
        mergedDelta.pinned_entities = [...(mergedDelta.pinned_entities ?? []), ...d.pinned_entities];
      }
      if (d.active_job_ids?.length) {
        mergedDelta.active_job_ids = [...(mergedDelta.active_job_ids ?? []), ...d.active_job_ids];
      }
      if (d.derived_cohorts?.length) {
        mergedDelta.derived_cohorts = [...(mergedDelta.derived_cohorts ?? []), ...d.derived_cohorts];
      }
    }
  }

  // --- Build composite result ---
  const allResults = steps.map((s) => stepResults.get(s.id)!).filter(Boolean);
  const okCount = allResults.filter((r) => r.status === "ok").length;
  const errorCount = allResults.filter((r) => r.status === "error").length;
  const skippedCount = allResults.filter((r) => r.status === "skipped").length;

  const statusSummary = allResults
    .map((r) => `[${r.id}] ${r.command}: ${r.status}${r.summary ? ` — ${r.summary.slice(0, 80)}` : ""}`)
    .join("\n");
  const textSummary = `Pipeline "${goal}": ${okCount}/${allResults.length} steps succeeded\n${statusSummary}`;

  const data: Record<string, unknown> = {
    goal,
    step_results: allResults,
  };

  if (errorCount === allResults.length) {
    return errorResult({
      message: textSummary,
      code: "pipeline_failed",
      tc,
      details: data,
    });
  }

  const opts = { text_summary: textSummary, data, state_delta: mergedDelta, tc };
  return (errorCount > 0 || skippedCount > 0) ? partialResult(opts) : okResult(opts);
}
