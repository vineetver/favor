/**
 * Workflow command handlers — multi-step operations in a single tool call.
 *
 * top_hits:        Best variants ranked by criteria, with auto-relaxation
 * qc_summary:      Cohort quality at a glance
 * gwas_minimal:    GWAS summary (correction + top hits + optional QC)
 * variant_profile: Deep dive on specific variants (entity + cohort data)
 * compare_cohorts: Side-by-side cohort comparison
 */

import { cohortFetch, agentFetch } from "../../../lib/api-client";
import type { RunCommand } from "../types";
import type { RunResultEnvelope } from "../run-result";
import { okResult, partialResult, errorResult, catchToResult, TraceCollector } from "../run-result";
import type { RunContext } from "../index";
import { fetchAndCacheSchema, getCachedSchema, getFingerprint } from "../schema-cache";
import type { NextAction } from "../recovery";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCohortId(cmd: { cohort_id?: string }, activeCohortId?: string): string | null {
  return cmd.cohort_id ?? activeCohortId ?? null;
}

// ---------------------------------------------------------------------------
// top_hits — Universal "give me the best variants"
// ---------------------------------------------------------------------------

export async function handleTopHits(
  cmd: Extract<RunCommand, { command: "top_hits" }>,
  ctx: RunContext,
): Promise<RunResultEnvelope> {
  const cohortId = getCohortId(cmd, ctx.activeCohortId);
  if (!cohortId) return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();
  const limit = cmd.limit ?? 10;

  try {
    // 1. Ensure we have schema (pre-gate may have already fetched it)
    const schema = ctx.schemaCache ?? await fetchAndCacheSchema(cohortId);
    tc.add({ step: "schema", kind: "cache", message: `Schema: ${schema.allColumns.length} columns, ${schema.rowCount} rows` });

    // 2. Build default criteria if none provided — use best available numeric scores
    const criteria = cmd.criteria?.length
      ? cmd.criteria
      : inferDefaultCriteria(schema.numericColumns);

    if (criteria.length === 0) {
      return errorResult({
        message: "No ranking criteria specified and no numeric columns available.",
        code: "validation_error",
        tc,
      });
    }

    // 3. If filters, probe for count
    let totalAfterFilter: number | undefined;
    if (cmd.filters?.length) {
      try {
        const probe = await cohortFetch<{ total?: number }>(
          `/cohorts/${encodeURIComponent(cohortId)}/rows`,
          { method: "POST", body: { filters: cmd.filters, limit: 1 }, timeout: 10_000 },
        );
        totalAfterFilter = probe.total ?? 0;
        tc.add({ step: "filterProbe", kind: "call", message: `${totalAfterFilter} variants after filters` });
      } catch {
        tc.add({ step: "filterProbe", kind: "call", message: "Probe failed, continuing" });
      }
    }

    // 4. Call prioritize
    tc.add({ step: "prioritize", kind: "call" });
    const body: Record<string, unknown> = { criteria, limit };
    if (cmd.filters?.length) body.filters = cmd.filters;

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/prioritize`,
      { method: "POST", body, timeout: 60_000 },
    );

    const rows = Array.isArray(result.rows) ? (result.rows as unknown[]).slice(0, limit) : [];
    const totalRanked = typeof result.total_ranked === "number" ? result.total_ranked : rows.length;

    // 5. If too few results and filters exist, suggest relaxation
    const nextActions: NextAction[] = [];
    if (rows.length < 3 && cmd.filters?.length) {
      nextActions.push({
        tool: "Run",
        args: { command: "top_hits", criteria, limit },
        reason: "Try without filters for more results",
        reason_code: "filter_relaxation",
        confidence: 0.8,
      });
    }

    return okResult({
      text_summary: `Top ${rows.length} of ${totalRanked} variants ranked by ${criteria.map((c) => c.column).join(", ")}`,
      data: {
        criteria,
        rows,
        total_ranked: totalRanked,
        ...(totalAfterFilter !== undefined ? { filtered_count: totalAfterFilter } : {}),
      },
      state_delta: {},
      tc,
      next_actions: nextActions.length ? nextActions : undefined,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

/** Pick sensible default ranking criteria from available numeric columns */
function inferDefaultCriteria(numericColumns: string[]): Array<{ column: string; desc: boolean }> {
  // Priority order of commonly useful scores
  const PREFERRED = [
    { col: "cadd_phred", desc: true },
    { col: "linsight", desc: true },
    { col: "revel", desc: true },
    { col: "alphamissense_score", desc: true },
    { col: "gnomad_af", desc: false }, // rare = better
  ];
  const available = new Set(numericColumns);
  const picked = PREFERRED.filter((p) => available.has(p.col)).slice(0, 3);
  return picked.map((p) => ({ column: p.col, desc: p.desc }));
}

// ---------------------------------------------------------------------------
// qc_summary — Cohort quality at a glance
// ---------------------------------------------------------------------------

export async function handleQcSummary(
  cmd: Extract<RunCommand, { command: "qc_summary" }>,
  ctx: RunContext,
): Promise<RunResultEnvelope> {
  const cohortId = getCohortId(cmd, ctx.activeCohortId);
  if (!cohortId) return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    // Parallel: schema + profile
    tc.add({ step: "fetchSchemaAndProfile", kind: "call" });
    const [schema, profileResult] = await Promise.all([
      ctx.schemaCache ?? fetchAndCacheSchema(cohortId),
      cohortFetch<Record<string, unknown>>(
        `/cohorts/${encodeURIComponent(cohortId)}/profile`,
        { timeout: 30_000 },
      ).catch(() => null),
    ]);

    // Parallel groupby on consequence + clinical_significance (if available)
    const groupbyPromises: Promise<Record<string, unknown> | null>[] = [];
    const groupbyLabels: string[] = [];

    if (schema.categoricalColumns.includes("consequence")) {
      groupbyPromises.push(
        cohortFetch<Record<string, unknown>>(
          `/cohorts/${encodeURIComponent(cohortId)}/groupby`,
          { method: "POST", body: { group_by: "consequence", limit: 20 }, timeout: 30_000 },
        ).catch(() => null),
      );
      groupbyLabels.push("consequence");
    }
    if (schema.categoricalColumns.includes("clinical_significance")) {
      groupbyPromises.push(
        cohortFetch<Record<string, unknown>>(
          `/cohorts/${encodeURIComponent(cohortId)}/groupby`,
          { method: "POST", body: { group_by: "clinical_significance", limit: 20 }, timeout: 30_000 },
        ).catch(() => null),
      );
      groupbyLabels.push("clinical_significance");
    }

    tc.add({ step: "groupbys", kind: "call", message: `Running ${groupbyPromises.length} groupby queries` });
    const groupbyResults = await Promise.all(groupbyPromises);

    // Build summary
    const distributions: Record<string, unknown> = {};
    for (let i = 0; i < groupbyLabels.length; i++) {
      const res = groupbyResults[i];
      if (res?.buckets) {
        distributions[groupbyLabels[i]] = {
          buckets: (res.buckets as unknown[]).slice(0, 15),
          total_groups: res.total_groups,
        };
      }
    }

    // Extract quality warnings from profile
    const warnings: string[] = [];
    if (profileResult) {
      const stats = profileResult.column_stats as Record<string, { null_fraction?: number }> | undefined;
      if (stats) {
        for (const [col, s] of Object.entries(stats)) {
          if (s?.null_fraction && s.null_fraction > 0.5) {
            warnings.push(`${col}: ${(s.null_fraction * 100).toFixed(0)}% missing`);
          }
        }
      }
    }

    return okResult({
      text_summary: `QC Summary: ${schema.rowCount} variants, ${schema.allColumns.length} columns, ${schema.dataType} cohort${warnings.length ? `. Warnings: ${warnings.length} columns >50% missing` : ""}`,
      data: {
        cohort_id: cohortId,
        data_type: schema.dataType,
        row_count: schema.rowCount,
        column_count: schema.allColumns.length,
        numeric_columns: schema.numericColumns.length,
        categorical_columns: schema.categoricalColumns.length,
        available_methods: schema.availableMethods,
        distributions,
        quality_warnings: warnings.length ? warnings : undefined,
        profile_summary: profileResult
          ? { columns_profiled: Object.keys(profileResult.column_stats ?? {}).length }
          : undefined,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

// ---------------------------------------------------------------------------
// gwas_minimal — GWAS summary in one shot
// ---------------------------------------------------------------------------

export async function handleGwasMinimal(
  cmd: Extract<RunCommand, { command: "gwas_minimal" }>,
  ctx: RunContext,
): Promise<RunResultEnvelope> {
  const cohortId = getCohortId(cmd, ctx.activeCohortId);
  if (!cohortId) return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const schema = ctx.schemaCache ?? await fetchAndCacheSchema(cohortId);

    // Step 1: Multiple testing correction
    tc.add({ step: "multipleTestingCorrection", kind: "call" });
    let correctionResult: Record<string, unknown> | null = null;
    try {
      const submitResp = await cohortFetch<{ run_id: string }>(
        `/cohorts/${encodeURIComponent(cohortId)}/analytics/run`,
        {
          method: "POST",
          body: { task: { type: "multiple_testing_correction", p_value_column: cmd.p_column, method: "bh" } },
          timeout: 30_000,
        },
      );
      // Poll for completion
      const { pollAnalyticsRun } = await import("../../../lib/api-client");
      correctionResult = await pollAnalyticsRun(cohortId, submitResp.run_id) as unknown as Record<string, unknown>;
      tc.add({ step: "correctionDone", kind: "call", message: `Run ${submitResp.run_id} completed` });
    } catch (err) {
      tc.warn("correction_failed", `Multiple testing correction failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 2: Optional GWAS QC
    let qcResult: Record<string, unknown> | null = null;
    if (cmd.effect_column && cmd.se_column_name && schema.availableMethods.includes("gwas_qc")) {
      try {
        tc.add({ step: "gwasQc", kind: "call" });
        const submitResp = await cohortFetch<{ run_id: string }>(
          `/cohorts/${encodeURIComponent(cohortId)}/analytics/run`,
          {
            method: "POST",
            body: {
              task: {
                type: "gwas_qc",
                p_value_column: cmd.p_column,
                effect_size_column: cmd.effect_column,
                se_column: cmd.se_column_name,
              },
            },
            timeout: 30_000,
          },
        );
        const { pollAnalyticsRun } = await import("../../../lib/api-client");
        qcResult = await pollAnalyticsRun(cohortId, submitResp.run_id) as unknown as Record<string, unknown>;
      } catch (err) {
        tc.warn("gwas_qc_failed", `GWAS QC failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 3: Top hits by raw p-value (ascending = most significant)
    tc.add({ step: "topHits", kind: "call" });
    let topHits: unknown[] = [];
    try {
      const hitResult = await cohortFetch<Record<string, unknown>>(
        `/cohorts/${encodeURIComponent(cohortId)}/prioritize`,
        {
          method: "POST",
          body: { criteria: [{ column: cmd.p_column, desc: false }], limit: 10 },
          timeout: 60_000,
        },
      );
      topHits = Array.isArray(hitResult.rows) ? (hitResult.rows as unknown[]).slice(0, 10) : [];
    } catch (err) {
      tc.warn("top_hits_failed", `Top hits failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const parts: string[] = [];
    if (correctionResult) parts.push("correction summary");
    if (qcResult) parts.push("GWAS QC");
    parts.push(`top ${topHits.length} hits by ${cmd.p_column}`);

    return okResult({
      text_summary: `GWAS summary: ${parts.join(", ")}`,
      data: {
        p_column: cmd.p_column,
        correction: correctionResult
          ? { summary: correctionResult.summary, metrics: correctionResult.metrics }
          : null,
        qc: qcResult
          ? { summary: qcResult.summary, metrics: qcResult.metrics }
          : null,
        top_hits: topHits,
        total_variants: schema.rowCount,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

// ---------------------------------------------------------------------------
// variant_profile — Deep dive on specific variants
// ---------------------------------------------------------------------------

interface ResolvedVariant {
  query: string;
  id: string | null;
  label: string | null;
  type: string | null;
}

/** Batch-resolve variant refs (rsIDs, VCF format, etc.) to graph entity IDs. */
async function resolveVariantRefs(variants: string[]): Promise<ResolvedVariant[]> {
  if (variants.length === 0) return [];
  try {
    const result = await agentFetch<{
      results: Array<{
        query: string;
        status: string;
        entity?: { type: string; id: string; label: string };
      }>;
    }>("/graph/resolve", {
      method: "POST",
      body: { queries: variants },
      timeout: 15_000,
    });
    return (result.results ?? []).map((r) => ({
      query: r.query,
      id: r.status.toLowerCase() === "matched" ? r.entity?.id ?? null : null,
      label: r.entity?.label ?? null,
      type: r.entity?.type ?? null,
    }));
  } catch {
    // Resolution failed — fall back to raw refs
    return variants.map((v) => ({ query: v, id: null, label: null, type: null }));
  }
}

export async function handleVariantProfile(
  cmd: Extract<RunCommand, { command: "variant_profile" }>,
  ctx: RunContext,
): Promise<RunResultEnvelope> {
  const cohortId = getCohortId(cmd, ctx.activeCohortId);
  const tc = new TraceCollector();

  try {
    const variantRefs = cmd.variants.slice(0, 5);

    // Step 1: Resolve variant refs to graph IDs
    tc.add({ step: "resolveVariants", kind: "call", message: `Resolving ${variantRefs.length} variant refs` });
    const resolved = await resolveVariantRefs(variantRefs);

    // Step 2: Fetch entity data for each resolved variant
    tc.add({ step: "fetchEntities", kind: "call", message: `Fetching ${resolved.length} variant profiles` });

    const entityPromises = resolved.map(async (rv) => {
      const entityId = rv.id;
      if (!entityId) {
        return { variant: rv.query, entity: null, error: `Could not resolve variant: ${rv.query}` };
      }
      try {
        const result = await agentFetch<Record<string, unknown>>(
          `/graph/Variant/${encodeURIComponent(entityId)}?include=counts,edges,rollups`,
          { timeout: 15_000 },
        );
        return { variant: rv.query, resolvedId: entityId, label: rv.label, entity: result, error: null };
      } catch (err) {
        return { variant: rv.query, resolvedId: entityId, entity: null, error: err instanceof Error ? err.message : String(err) };
      }
    });

    // Step 3: If cohort active, fetch matching rows
    let cohortData: Record<string, unknown>[] | null = null;
    if (cohortId) {
      try {
        tc.add({ step: "fetchCohortRows", kind: "call" });
        const schema = ctx.schemaCache ?? await fetchAndCacheSchema(cohortId);
        const hasRsid = schema.allColumns.includes("rsid");
        const hasVid = schema.allColumns.includes("vid");

        // Split variants by format for filtering
        const rsIds = variantRefs.filter((v) => v.startsWith("rs"));
        // VCF format: chr-pos-ref-alt (e.g. 1-12345-A-T)
        const vcfRefs = variantRefs.filter((v) => /^\d+-.+-[A-Z]+-[A-Z]+$/i.test(v));

        // Try rsid filter first, fall back to vid
        let rowResult: { rows?: unknown[] } | null = null;
        if (hasRsid && rsIds.length > 0) {
          rowResult = await cohortFetch<{ rows?: unknown[] }>(
            `/cohorts/${encodeURIComponent(cohortId)}/rows`,
            {
              method: "POST",
              body: { limit: variantRefs.length },
              timeout: 15_000,
            },
          ).catch(() => null);
          // Client-side filter on rsid match
          if (rowResult?.rows) {
            const rsSet = new Set(rsIds);
            const filtered = (rowResult.rows as Record<string, unknown>[]).filter(
              (row) => typeof row.rsid === "string" && rsSet.has(row.rsid),
            );
            cohortData = filtered.length > 0 ? filtered : null;
          }
        }
        if (!cohortData && hasVid && vcfRefs.length > 0) {
          // Fetch a larger sample and filter client-side by vid
          rowResult = await cohortFetch<{ rows?: unknown[] }>(
            `/cohorts/${encodeURIComponent(cohortId)}/rows`,
            {
              method: "POST",
              body: { limit: 100 },
              timeout: 15_000,
            },
          ).catch(() => null);
          if (rowResult?.rows) {
            const vidSet = new Set(vcfRefs);
            const filtered = (rowResult.rows as Record<string, unknown>[]).filter(
              (row) => typeof row.vid === "string" && vidSet.has(row.vid),
            );
            cohortData = filtered.length > 0 ? filtered : null;
          }
        }
      } catch {
        // Cohort data not critical — skip gracefully
      }
    }

    const entityResults = await Promise.all(entityPromises);

    const profiles = entityResults.map((er) => ({
      variant: er.variant,
      ...(er.resolvedId ? { resolvedId: er.resolvedId } : {}),
      ...(er.label ? { label: er.label } : {}),
      ...(er.entity ? { entity: er.entity } : {}),
      ...(er.error ? { error: er.error } : {}),
    }));

    const succeeded = profiles.filter((p) => !("error" in p) || p.error === null).length;
    const failed = profiles.length - succeeded;

    // Suggest follow-up traverse chain when entity has graph connections
    const next_actions: NextAction[] = [];
    for (const profile of profiles) {
      const entity = (profile.entity as { data?: Record<string, unknown> } | undefined)?.data;
      if (!entity) continue;

      const label = (profile as { label?: string }).label ?? profile.variant;
      const hasGene = !!entity.gencode_gene_id;
      const hasCcre = !!entity.ccre_accessions;

      if (hasGene) {
        next_actions.push({
          tool: "Run",
          args: {
            command: "traverse",
            seed: { label },
            steps: [
              { into: "genes" },
              { into: "diseases", top: 5 },
              { into: "phenotypes", top: 5 },
            ],
          },
          reason: `Trace ${label} through gene connections to diseases and phenotypes`,
          confidence: 0.7,
        });
      }

      if (hasCcre) {
        next_actions.push({
          tool: "Run",
          args: {
            command: "traverse",
            seed: { label },
            steps: [
              { into: "ccres" },
              { into: "genes" },
              { into: "tissues", top: 5 },
            ],
          },
          reason: `Trace ${label} through cCRE regulation to genes and tissue expression`,
          confidence: 0.7,
        });
      }
    }

    return (failed > 0 && succeeded > 0
      ? partialResult
      : okResult)({
      text_summary: `Profiled ${succeeded}/${profiles.length} variants${cohortData ? ` with cohort data` : ""}`,
      data: {
        profiles,
        ...(cohortData ? { cohort_rows: cohortData } : {}),
      },
      state_delta: {},
      tc,
      ...(next_actions.length > 0 ? { next_actions } : {}),
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

// ---------------------------------------------------------------------------
// compare_cohorts — Side-by-side comparison
// ---------------------------------------------------------------------------

export async function handleCompareCohorts(
  cmd: Extract<RunCommand, { command: "compare_cohorts" }>,
  ctx: RunContext,
): Promise<RunResultEnvelope> {
  const [id1, id2] = cmd.cohort_ids;
  const tc = new TraceCollector();

  try {
    // 1. Parallel: fetch schemas for both cohorts
    tc.add({ step: "fetchSchemas", kind: "call" });
    const [schema1, schema2] = await Promise.all([
      fetchAndCacheSchema(id1),
      fetchAndCacheSchema(id2),
    ]);

    // Find common columns
    const commonColumns = new Set(
      schema1.allColumns.filter((c) => schema2.allColumns.includes(c)),
    );
    const compareColumns = cmd.compare_on.filter((c) => commonColumns.has(c));

    if (compareColumns.length === 0) {
      return errorResult({
        message: `No common columns found among: ${cmd.compare_on.join(", ")}`,
        code: "validation_error",
        hint: `Common columns: ${[...commonColumns].slice(0, 20).join(", ")}`,
        tc,
      });
    }

    // 2. Parallel: run groupby on both cohorts for each compare column
    tc.add({ step: "groupbys", kind: "call", message: `Comparing ${compareColumns.length} columns` });

    const comparisons: Record<string, { cohort_1: unknown; cohort_2: unknown }> = {};
    await Promise.all(
      compareColumns.map(async (col) => {
        const [g1, g2] = await Promise.all([
          cohortFetch<Record<string, unknown>>(
            `/cohorts/${encodeURIComponent(id1)}/groupby`,
            { method: "POST", body: { group_by: col, limit: 20 }, timeout: 30_000 },
          ).catch(() => null),
          cohortFetch<Record<string, unknown>>(
            `/cohorts/${encodeURIComponent(id2)}/groupby`,
            { method: "POST", body: { group_by: col, limit: 20 }, timeout: 30_000 },
          ).catch(() => null),
        ]);
        comparisons[col] = {
          cohort_1: g1 ? { buckets: (g1.buckets as unknown[] ?? []).slice(0, 15), total_groups: g1.total_groups } : null,
          cohort_2: g2 ? { buckets: (g2.buckets as unknown[] ?? []).slice(0, 15), total_groups: g2.total_groups } : null,
        };
      }),
    );

    // 3. Run correlation between shared numeric columns (if any)
    const commonNumeric = compareColumns.filter(
      (c) => schema1.numericColumns.includes(c) && schema2.numericColumns.includes(c),
    );

    return okResult({
      text_summary: `Compared ${compareColumns.length} columns across 2 cohorts (${schema1.rowCount} vs ${schema2.rowCount} variants)`,
      data: {
        cohort_1: { id: id1, data_type: schema1.dataType, row_count: schema1.rowCount },
        cohort_2: { id: id2, data_type: schema2.dataType, row_count: schema2.rowCount },
        common_columns: [...commonColumns].slice(0, 30),
        comparisons,
        common_numeric_columns: commonNumeric,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}
