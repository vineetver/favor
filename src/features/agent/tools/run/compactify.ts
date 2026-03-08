/**
 * compactify.ts — Compact Run tool output for model context.
 *
 * execute() returns full data for the frontend (p.output).
 * toModelOutput calls compactRunForModel to give the model a trimmed view:
 *   - status + text_summary (always)
 *   - top-K preview of large arrays
 *   - _truncation metadata when data was trimmed
 *   - state_delta / artifacts / next_reads pass through
 *   - trace / warnings / candidates / suggested_next / budgets_remaining pass through
 */

import type { RunResult, NextAction } from "./types";
import { humanEdgeLabel, humanScoreLabel } from "./handlers/graph";

interface TruncationInfo {
  truncated: true;
  returned: number;
  total: number;
  reason?: "max_rows" | "max_points" | "token_budget" | "detail_level";
  how_to_get_more?: NextAction;
  hint?: string;
}

// Backwards-compatible alias
type Truncation = TruncationInfo;

/** Cast to satisfy ToolResultOutput's JSONValue constraint */
type CompactValue = { type: "json"; value: null };

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function compactRunForModel(
  command: string,
  result: RunResult,
): CompactValue {
  if (result.status === "error" || result.data?.error) {
    return json(result);
  }

  const compactor = COMPACTORS[command];
  if (!compactor) return json(buildEnvelope(result));

  const compactData = compactor(result.data ?? {});
  return json(buildEnvelope(result, compactData));
}

/** Build the model-facing envelope with all new fields */
function buildEnvelope(
  result: RunResult,
  compactData?: Record<string, unknown>,
): Record<string, unknown> {
  const envelope: Record<string, unknown> = {
    status: result.status,
    text_summary: result.text_summary,
    data: compactData ?? result.data,
    state_delta: result.state_delta,
  };

  if (result.artifacts?.length) envelope.artifacts = result.artifacts;
  if (result.next_reads?.length) envelope.next_reads = result.next_reads;
  if (result.warnings?.length) envelope.warnings = result.warnings;
  if (result.trace?.length) envelope.trace = result.trace;
  if (result.candidates?.length) envelope.candidates = result.candidates;
  if (result.resolved_info) envelope.resolved_info = result.resolved_info;
  if (result.suggested_next?.length) envelope.suggested_next = result.suggested_next;
  if (result.budgets_remaining) envelope.budgets_remaining = result.budgets_remaining;
  if (result.error) envelope.error = result.error;
  if (result.repairs?.length) envelope.repairs = result.repairs;
  if (result.next_actions?.length) envelope.next_actions = result.next_actions;
  if (result.incomplete) {
    envelope.incomplete = true;
    if (result.next_cursor != null) envelope.next_cursor = result.next_cursor;
  }

  return envelope;
}

// ---------------------------------------------------------------------------
// Per-command compactors
// ---------------------------------------------------------------------------

type Compactor = (data: Record<string, unknown>) => Record<string, unknown>;

const COMPACTORS: Record<string, Compactor> = {
  rows: compactRows,
  groupby: compactGroupby,
  correlation: compactCorrelation,
  derive: compactDerive,
  prioritize: compactPrioritize,
  compute: compactCompute,
  explore: compactExplore,
  traverse: compactTraverse,
  analytics: compactAnalytics,
  "analytics.poll": compactAnalyticsPoll,
  viz: compactViz,
  // Workflow compactors
  top_hits: compactTopHits,
  qc_summary: passthrough,
  gwas_minimal: compactGwasMinimal,
  variant_profile: compactVariantProfile,
  compare_cohorts: passthrough,
  // Pipeline
  pipeline: compactPipeline,
  // Virtual pipeline steps — small results, pass through
  intersect: passthrough,
  union: passthrough,
  // Workspace compactors — small results, pass through
  pin: passthrough,
  set_cohort: passthrough,
  remember: passthrough,
  export: passthrough,
  create_cohort: passthrough,
};

function compactCorrelation(data: Record<string, unknown>): Record<string, unknown> {
  // Correlation can return a large matrix — extract top correlations only
  const out: Record<string, unknown> = {
    x: data.x,
    y: data.y,
  };
  if (typeof data.r === "number") out.r = Math.round(data.r * 10000) / 10000;
  if (typeof data.p_value === "number") out.p_value = data.p_value;
  if (typeof data.n === "number") out.n = data.n;

  // If there's a full matrix, extract top 10 pairs by |r|
  const matrix = asArray(data.matrix);
  if (matrix.length > 0) {
    const pairs = matrix as Array<Record<string, unknown>>;
    const sorted = [...pairs]
      .sort((a, b) => Math.abs(b.r as number ?? 0) - Math.abs(a.r as number ?? 0))
      .slice(0, 10);
    out.top_correlations = sorted;
    if (matrix.length > 10) {
      out._truncation = truncation(10, matrix.length, "Top correlations by |r|. Use rows to see full data.");
    }
  }
  return out;
}

function compactDerive(data: Record<string, unknown>): Record<string, unknown> {
  // Don't send full row data for derived cohorts — just the metadata
  return {
    cohort_id: data.cohort_id ?? data.id,
    label: data.label,
    row_count: data.row_count ?? data.total,
    filters_applied: data.filters,
    parent_id: data.parent_id,
    // Include a small preview if rows are present
    ...(data.rows
      ? {
          preview: asArray(data.rows).slice(0, 3),
          _truncation: asArray(data.rows).length > 3
            ? truncation(3, asArray(data.rows).length, "Use rows command on the new cohort for full data.")
            : undefined,
        }
      : {}),
  };
}

function compactAnalyticsPoll(data: Record<string, unknown>): Record<string, unknown> {
  if (data.status === "running" || data.status === "queued") {
    return {
      status: data.status,
      run_id: data.run_id ?? data.runId,
      progress: data.progress,
    };
  }
  // Completed — use the analytics compactor
  return compactAnalytics(data);
}

function compactViz(data: Record<string, unknown>): Record<string, unknown> {
  // Viz returns chart data for the frontend — model only needs metadata
  return {
    chart_id: data.chart_id,
    chart_type: data.chart_type,
    title: data.title,
    rendered: true,
    point_count: asArray((data.data as Record<string, unknown>)?.points ?? (data.data as Record<string, unknown>)?.bars ?? []).length,
  };
}

function compactRows(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const total = asNumber(data.total, rows.length);
  const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

  // Respect user-requested limits: only truncate if > 10 rows
  if (rows.length <= 10) {
    return { rows, total, columns };
  }
  return {
    rows,
    total,
    columns,
    _truncation: truncation(rows.length, total),
  };
}

function compactGroupby(data: Record<string, unknown>): Record<string, unknown> {
  const buckets = asArray(data.buckets);
  const totalGroups = asNumber(data.total_groups, buckets.length);
  const top = buckets.slice(0, 10);

  const out: Record<string, unknown> = {
    group_by: data.group_by,
    buckets: top,
    total_groups: totalGroups,
  };
  if (buckets.length > 10) {
    out.otherBucketsCount = buckets.length - 10;
    out._truncation = truncation(10, buckets.length, "use groupby with filters to narrow");
  }
  return out;
}

function compactPrioritize(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalRanked = asNumber(data.total_ranked, rows.length);
  const top = rows.slice(0, 5);

  const out: Record<string, unknown> = {
    criteria: data.criteria,
    rows: top,
    total_ranked: totalRanked,
  };
  if (rows.length > 5) {
    out._truncation = truncation(5, rows.length);
  }
  return out;
}

function compactCompute(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalScored = asNumber(data.total_scored, rows.length);
  const top = rows.slice(0, 5);

  const out: Record<string, unknown> = {
    rows: top,
    total_scored: totalScored,
  };
  if (rows.length > 5) {
    out._truncation = truncation(5, rows.length);
  }
  return out;
}

function compactExplore(data: Record<string, unknown>): Record<string, unknown> {
  const results = data.results as Record<string, { count: number; edgeType: string; scoreField?: string; top: unknown[] }> | undefined;
  if (!results) return data;

  const compactResults: Record<string, unknown> = {};
  const renderedTables: { intent: string; relationship: string; markdown: string; shown: number; total: number }[] = [];

  const TABLE_K = 5;  // rendered table: top 5 (for display)
  const LIST_K = 20;  // slim JSON: up to 20 (for intersection / follow-up)

  for (const [key, branch] of Object.entries(results)) {
    const allTop = asArray(branch.top);
    const tableTop = allTop.slice(0, TABLE_K) as Ent[];
    const listTop = allTop.slice(0, LIST_K) as Ent[];
    const relationship = humanEdgeLabel(branch.edgeType);

    // Pre-render markdown table (top 5 only — keeps output concise)
    const table = renderEntityTable(tableTop, { scoreField: branch.scoreField, showProvenance: true });
    if (table) {
      renderedTables.push({ intent: key, relationship, markdown: table, shown: tableTop.length, total: branch.count });
    }

    // Slim JSON: up to 20 entities for cross-list intersection / follow-up seeds
    const branchObj: Record<string, unknown> = {
      count: branch.count,
      relationship,
      top: listTop.map(minimalEntity),
      ...(allTop.length > LIST_K ? { _truncation: truncation(LIST_K, allTop.length, "explore with narrower intent for more") } : {}),
    };
    // Preserve availableRelationships so the model can retry with alternative edge types
    const avail = (branch as Record<string, unknown>).availableRelationships;
    if (Array.isArray(avail) && avail.length > 0) {
      branchObj.availableRelationships = avail;
    }
    compactResults[key] = branchObj;
  }

  const out: Record<string, unknown> = {
    results: compactResults,
    resolved_seeds: data.resolved_seeds,
  };
  if (renderedTables.length) out.rendered = { tables: renderedTables };
  // Pass through enrichment if present (already reasonably sized)
  if (data.enrichment) out.enrichment = data.enrichment;
  // Pass through aggregate data (already small)
  if (data.seed) out.seed = data.seed;
  if (data.relationship) out.relationship = data.relationship;
  else if (data.edgeType) out.relationship = humanEdgeLabel(data.edgeType as string);
  if (data.metric) out.metric = data.metric;
  if (data.value !== undefined) out.value = data.value;
  if (data.buckets) {
    const buckets = asArray(data.buckets);
    out.buckets = buckets.slice(0, 10);
    if (buckets.length > 10) {
      out._truncation = truncation(10, buckets.length);
    }
  }
  // Pass through compare results — render shared neighbors table
  if (data.comparisons) out.comparisons = data.comparisons;
  if (data.overallSimilarity) out.overallSimilarity = data.overallSimilarity;
  if (data.sharedNeighbors) {
    const shared = asArray(data.sharedNeighbors).slice(0, 10) as Ent[];
    out.sharedNeighbors = shared.map(minimalEntity);
    const table = renderEntityTable(shared, { scoreField: undefined, showProvenance: false });
    if (table && !out.rendered) out.rendered = { tables: [{ intent: "shared", relationship: "shared neighbors", markdown: table, shown: shared.length, total: asArray(data.sharedNeighbors).length }] };
    if (asArray(data.sharedNeighbors).length > 10) {
      out._truncation = truncation(10, asArray(data.sharedNeighbors).length);
    }
  }
  // Pass through context entities — raise limit + add type breakdown
  if (data.entities) {
    const entities = asArray(data.entities);
    out.entities = (entities.slice(0, 10) as Ent[]).map(minimalEntity);
    if (entities.length > 10) {
      const byType: Record<string, number> = {};
      for (const e of entities) {
        const t = (e as Ent).type as string ?? "unknown";
        byType[t] = (byType[t] ?? 0) + 1;
      }
      out.entity_type_counts = byType;
      out._truncation = truncation(10, entities.length,
        `${entities.length - 10} more entities available. Filter by type for specifics.`,
      );
    }
  }
  // Pass through similar results
  if (data.similar) {
    const similar = asArray(data.similar);
    out.similar = (similar.slice(0, 5) as Ent[]).map(minimalEntity);
    if (similar.length > 5) {
      out._truncation = truncation(5, similar.length);
    }
  }
  // Pass through method description
  if (data._method) out._method = data._method;
  return out;
}

/** Minimal entity shape — drop fields already covered by rendered table. */
function minimalEntity(e: Ent): Ent {
  const out: Ent = { type: e.type, id: e.id, label: e.label };
  if (typeof e.score === "number") out.score = Math.round((e.score as number) * 10000) / 10000;
  if (typeof e.supportCount === "number") out.supportCount = e.supportCount;
  return out;
}

function compactTraverse(data: Record<string, unknown>): Record<string, unknown> {
  // Patterns mode — delegate to compactPatterns if matches present
  const matches = asArray(data.matches);
  if (matches.length > 0) return compactPatterns(data);

  // Chain mode
  const steps = data.steps as Array<{
    intent: string;
    edgeType?: string;
    count: number;
    top: unknown[];
    edgeDescription?: string;
    scoreField?: string;
  }> | undefined;
  if (steps) {
    const TOP_K = 10;
    const renderedTables: { step: string; relationship: string; markdown: string; shown: number; total: number }[] = [];

    const compactSteps = steps.map((s, i) => {
      const relationship = s.edgeDescription
        ? s.edgeDescription.replace(/:.*$/, "").trim()
        : s.edgeType
          ? humanEdgeLabel(s.edgeType)
          : undefined;
      const scoreContext = s.scoreField
        ? humanScoreLabel(s.scoreField)
        : undefined;

      const topEntities = asArray(s.top).slice(0, TOP_K).map((e) => {
        const ent = e as Ent;
        const out: Ent = {
          type: ent.type,
          id: ent.id,
          label: ent.label,
          subtitle: truncateStr(ent.subtitle as string | undefined, 80),
        };
        if (ent.rank != null) out.rank = ent.rank;
        if (typeof ent.score === "number") out.score = Math.round(ent.score * 10000) / 10000;
        if (typeof ent.pValue === "number") out.pValue = ent.pValue;
        if (typeof ent.foldEnrichment === "number") out.foldEnrichment = ent.foldEnrichment;
        if (typeof ent.supportCount === "number") out.supportCount = ent.supportCount;
        if (ent.edgeProperties && typeof ent.edgeProperties === "object") {
          out.edgeProperties = capEdgeProperties(ent.edgeProperties as Record<string, unknown>);
        }
        return out;
      });

      // Pre-render markdown table for this step
      const table = renderEntityTable(topEntities, {
        scoreField: s.scoreField,
        showProvenance: true,
        showSupport: true,
      });
      if (table) {
        renderedTables.push({
          step: `Step ${i + 1}: ${s.intent} (via ${relationship ?? s.edgeType ?? "?"})`,
          relationship: relationship ?? s.intent,
          markdown: table,
          shown: topEntities.length,
          total: s.count,
        });
      }

      // Slim JSON: drop subtitle + edgeProperties (covered by rendered table)
      const slimEntities = topEntities.map(minimalEntity);

      return {
        intent: s.intent,
        count: s.count,
        ...(relationship ? { relationship } : {}),
        ...(scoreContext ? { scoreContext } : {}),
        top: slimEntities,
        ...(s.top.length > TOP_K ? { _truncation: truncation(TOP_K, s.top.length) } : {}),
      };
    });

    return {
      seed: data.seed,
      steps: compactSteps,
      ...(renderedTables.length ? { rendered: { tables: renderedTables } } : {}),
    };
  }

  // Paths mode — already compact (path nodes are essential)
  return data;
}

function compactPatterns(data: Record<string, unknown>): Record<string, unknown> {
  const matches = asArray(data.matches);
  const totalMatches = asNumber(data.totalMatches, matches.length);
  const top = matches.slice(0, 5);

  const out: Record<string, unknown> = {
    pattern: data.pattern,
    matches: top,
    totalMatches,
  };
  if (matches.length > 5) {
    out._truncation = truncation(5, matches.length, "add filters or narrow pattern for more");
  }
  // Strip the large `nodes` map — model doesn't need it
  return out;
}

function compactAnalytics(data: Record<string, unknown>): Record<string, unknown> {
  const charts = asArray(data.charts);
  // Keep chart metadata (type, title, chart_id) but strip raw point arrays
  // The frontend already has the full data from p.output; model only needs summaries
  const compactCharts = charts.map((c) => {
    const chart = c as Record<string, unknown>;
    const chartData = chart.data as Record<string, unknown> | undefined;
    const pointCount = chartData
      ? (asArray(chartData.points).length || asArray(chartData.bars).length || 0)
      : 0;
    return {
      chart_id: chart.chart_id,
      chart_type: chart.chart_type,
      title: chart.title,
      point_count: pointCount,
    };
  });

  return {
    taskType: data.taskType,
    runId: data.runId,
    summary: data.summary,
    metrics: data.metrics,
    charts: compactCharts,
    _cohort: data._cohort,
  };
}

// ---------------------------------------------------------------------------
// Workflow compactors
// ---------------------------------------------------------------------------

function passthrough(data: Record<string, unknown>): Record<string, unknown> {
  return data;
}

function compactTopHits(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalRanked = asNumber(data.total_ranked, rows.length);
  const top = rows.slice(0, 10);

  const out: Record<string, unknown> = {
    criteria: data.criteria,
    rows: top,
    total_ranked: totalRanked,
  };
  if (data.filtered_count !== undefined) out.filtered_count = data.filtered_count;
  if (rows.length > 10) {
    out._truncation = truncation(10, totalRanked, "max_rows", {
      tool: "Run",
      args: { command: "rows", sort: "composite_score", desc: true, limit: 50 },
      reason: "Fetch more ranked variants",
    });
  }
  return out;
}

function compactGwasMinimal(data: Record<string, unknown>): Record<string, unknown> {
  const topHits = asArray(data.top_hits).slice(0, 10);
  return {
    p_column: data.p_column,
    correction: data.correction,
    qc: data.qc,
    top_hits: topHits,
    total_variants: data.total_variants,
  };
}

function compactVariantProfile(data: Record<string, unknown>): Record<string, unknown> {
  const profiles = asArray(data.profiles).slice(0, 5).map(compactOneProfile);
  const out: Record<string, unknown> = { profiles };
  if (data.cohort_rows) {
    out.cohort_rows = asArray(data.cohort_rows).slice(0, 5);
  }
  return out;
}

/** Extract a structured, LLM-friendly summary from a single variant profile. */
function compactOneProfile(raw: unknown): Record<string, unknown> {
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {
    variant: p.variant,
    ...(p.resolvedId ? { resolvedId: p.resolvedId } : {}),
    ...(p.label ? { label: p.label } : {}),
    ...(p.error ? { error: p.error } : {}),
  };

  const entity = p.entity as Record<string, unknown> | undefined;
  if (!entity) return out;

  const d = (entity.data ?? {}) as Record<string, unknown>;
  const included = (entity.included ?? {}) as Record<string, unknown>;
  const counts = (included.counts ?? {}) as Record<string, number>;
  // API returns relations (with rows[].neighbor + rows[].link), not edges
  const relations = (included.relations ?? {}) as Record<string, { rows?: unknown[] }>;

  // — Identity
  if (d.chromosome) out.chromosome = d.chromosome;
  if (d.position) out.position = d.position;
  if (d.ref) out.ref = d.ref;
  if (d.alt) out.alt = d.alt;

  // — Gene context
  if (d.gencode_gene_id) out.gene = d.gencode_gene_id;

  // — Key scores
  const scores = stripNulls({
    gnomad_af: d.gnomad_af,
    cadd_phred: d.cadd_phred,
    linsight: d.linsight,
    fathmm_xf: d.fathmm_xf,
    phylop_mammals: d.phylop_mammals,
    phylop_vertebrates: d.phylop_vertebrates,
  });
  if (Object.keys(scores).length) out.scores = scores;

  // — cCRE
  if (d.ccre_accessions) {
    out.ccre = stripNulls({
      accession: d.ccre_accessions,
      annotation: d.ccre_annotations,
    });
  }

  // — ClinVar
  const clinvar = stripNulls({
    significance: d.clinvar_significance ?? d.clinvar_clnsig,
    review_status: d.clinvar_review_status,
  });
  if (Object.keys(clinvar).length) out.clinvar = clinvar;

  // — Relation counts (compact: type → count)
  const relationCounts: Array<{ type: string; count: number }> = [];
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) relationCounts.push({ type: k, count: v });
  }
  relationCounts.sort((a, b) => b.count - a.count);
  if (relationCounts.length) out.relationCounts = relationCounts;

  // — Top relations per edge type (from included.relations)
  // Skip noisy edge types that waste context budget
  const SKIP_EDGE_TYPES = new Set(["SIGNAL_HAS_VARIANT", "VARIANT_ASSOCIATED_WITH_STUDY"]);
  const topRelations: Record<string, unknown[]> = {};
  for (const [edgeType, group] of Object.entries(relations)) {
    if (SKIP_EDGE_TYPES.has(edgeType)) continue;
    const rows = asArray(group?.rows);
    if (!rows.length) continue;

    const seen = new Set<string>();
    const compact: Record<string, unknown>[] = [];
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const neighbor = r.neighbor as Record<string, unknown> | undefined;
      const link = r.link as Record<string, unknown> | undefined;
      if (!neighbor) continue;

      const nId = String(neighbor.id ?? "");
      if (!nId || seen.has(nId)) continue;
      seen.add(nId);

      const item: Record<string, unknown> = {
        name: neighbor.label ?? neighbor.name ?? nId,
        type: neighbor.type,
        id: nId,
      };

      // Extract curated edge props from link.props
      const props = ((link?.props ?? {}) as Record<string, unknown>);
      const edgeProps = compactEdgeProps(edgeType, props);
      if (edgeProps) item.evidence = edgeProps;

      compact.push(item);
      if (compact.length >= 3) break;
    }

    if (compact.length) {
      topRelations[edgeType] = compact;
    }
  }
  if (Object.keys(topRelations).length) out.topRelations = topRelations;
  out.totalNeighborTypes = Object.keys(counts).filter((k) => counts[k] > 0).length;

  return out;
}

/** Pick only informative edge props per edge type. */
function compactEdgeProps(edgeType: string, props: Record<string, unknown>): Record<string, unknown> | null {
  // Per-edge-type field selection
  const FIELDS_BY_TYPE: Record<string, string[]> = {
    VARIANT_OVERLAPS_CCRE: ["annotation", "annotation_label", "distance_to_center", "ccre_size"],
    VARIANT_IMPLIES_GENE: ["implication_mode", "l2g_score", "confidence_class", "n_loci", "gene_symbol"],
    VARIANT_AFFECTS_GENE: ["variant_consequence", "region_type", "gene_symbol"],
    VARIANT_ASSOCIATED_WITH_TRAIT__Entity: ["p_value_mlog", "or_beta", "risk_allele", "clinical_significance"],
    VARIANT_ASSOCIATED_WITH_TRAIT__Disease: ["p_value_mlog", "clinical_significance", "review_status"],
    VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype: ["p_value_mlog", "or_beta", "risk_allele"],
    VARIANT_ASSOCIATED_WITH_DRUG: ["clinical_significance", "evidence_count", "direction_of_effect", "drug_name"],
    VARIANT_ASSOCIATED_WITH_STUDY: ["p_value_mlog", "or_beta", "risk_allele", "trait_name"],
    VARIANT_LINKED_TO_SIDE_EFFECT: ["side_effect_name", "drug_name", "gene_symbol", "confidence_class"],
    CCRE_REGULATES_GENE: ["max_score", "n_tissues", "method"],
  };

  const keepFields = FIELDS_BY_TYPE[edgeType];
  if (!keepFields) return null;

  const out: Record<string, unknown> = {};
  for (const field of keepFields) {
    if (props[field] != null) out[field] = props[field];
  }
  return Object.keys(out).length > 0 ? out : null;
}

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

// ---------------------------------------------------------------------------
// Pipeline compactor
// ---------------------------------------------------------------------------

function compactPipeline(data: Record<string, unknown>): Record<string, unknown> {
  const stepResults = asArray(data.step_results);
  const compactSteps = stepResults.map((sr) => {
    const step = sr as Record<string, unknown>;
    if (step.status === "error" || step.status === "skipped") {
      return {
        id: step.id, command: step.command, status: step.status,
        summary: step.summary, skip_reason: step.skip_reason,
      };
    }
    const cmd = step.command as string;
    // Depth guard: never recurse into another pipeline compactor
    if (cmd === "pipeline") {
      return { id: step.id, command: cmd, status: "error", summary: "Nested pipeline rejected" };
    }
    const compactor: Compactor | undefined = COMPACTORS[cmd];
    const stepData = step.data as Record<string, unknown> | undefined;
    const compactData = compactor != null && stepData ? compactor(stepData) : stepData;
    return {
      id: step.id, command: cmd, status: step.status,
      summary: step.summary, data: compactData,
      ...(step.entities ? { entities: asArray(step.entities).slice(0, 5) } : {}),
      ...(step.entities_meta ? { entities_meta: step.entities_meta } : {}),
    };
  });
  return {
    goal: data.goal,
    steps_ok: stepResults.filter((s) => (s as Record<string, unknown>).status === "ok").length,
    steps_total: stepResults.length,
    step_results: compactSteps,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(value: unknown): CompactValue {
  return { type: "json", value: value as null };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

function truncateStr(s: string | undefined, max: number): string | undefined {
  if (!s || s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/** Keep at most 5 edge properties, prioritising score/evidence fields. */
const PRIORITY_EDGE_PATTERNS = [
  /score/i, /evidence/i, /p_value/i, /confidence/i, /phase/i, /mechanism/i,
];

function capEdgeProperties(props: Record<string, unknown>): Record<string, unknown> {
  const MAX = 5;
  const entries = Object.entries(props);
  if (entries.length <= MAX) return props;

  // Partition into priority vs rest
  const priority: [string, unknown][] = [];
  const rest: [string, unknown][] = [];
  for (const entry of entries) {
    if (PRIORITY_EDGE_PATTERNS.some((p) => p.test(entry[0]))) {
      priority.push(entry);
    } else {
      rest.push(entry);
    }
  }
  const kept = [...priority, ...rest].slice(0, MAX);
  return Object.fromEntries(kept);
}

function truncation(
  returned: number,
  total: number,
  reason?: TruncationInfo["reason"] | string,
  how_to_get_more?: NextAction,
): TruncationInfo {
  // When called with old 3-arg signature (returned, total, hint_string)
  if (typeof reason === "string" && !["max_rows", "max_points", "token_budget", "detail_level"].includes(reason)) {
    return { truncated: true, returned, total, hint: reason };
  }
  return {
    truncated: true,
    returned,
    total,
    ...(reason ? { reason: reason as TruncationInfo["reason"] } : {}),
    ...(how_to_get_more ? { how_to_get_more } : {}),
  };
}

// ---------------------------------------------------------------------------
// Pre-rendering: score interpretation + markdown tables
// ---------------------------------------------------------------------------

interface ScoreThreshold {
  min: number;
  label: string;
}

/** Score field → ordered thresholds (highest first). */
const SCORE_THRESHOLDS: Record<string, ScoreThreshold[]> = {
  ot_score: [
    { min: 0.8, label: "very strong" },
    { min: 0.5, label: "strong" },
    { min: 0.3, label: "moderate" },
    { min: 0, label: "weak" },
  ],
  l2g_score: [
    { min: 0.5, label: "high confidence" },
    { min: 0.2, label: "moderate" },
    { min: 0, label: "low confidence" },
  ],
  cadd_phred: [
    { min: 30, label: "top 0.1% deleterious" },
    { min: 20, label: "top 1% deleterious" },
    { min: 10, label: "top 10%" },
    { min: 0, label: "benign-range" },
  ],
  alphamissense_pathogenicity: [
    { min: 0.564, label: "pathogenic" },
    { min: 0.34, label: "ambiguous" },
    { min: 0, label: "benign" },
  ],
  max_clinical_phase: [
    { min: 4, label: "approved" },
    { min: 3, label: "phase III" },
    { min: 2, label: "phase II" },
    { min: 1, label: "phase I" },
    { min: 0, label: "preclinical" },
  ],
  affinity_median: [
    { min: 9, label: "sub-nM" },
    { min: 7, label: "nM-range" },
    { min: 5, label: "µM-range" },
    { min: 0, label: "weak" },
  ],
  combined_score: [
    { min: 0.9, label: "highest confidence" },
    { min: 0.7, label: "high confidence" },
    { min: 0.4, label: "medium confidence" },
    { min: 0, label: "low confidence" },
  ],
  overall_score: [
    { min: 0.8, label: "very strong" },
    { min: 0.5, label: "strong" },
    { min: 0.3, label: "moderate" },
    { min: 0, label: "weak" },
  ],
  score: [
    { min: 0.8, label: "very strong" },
    { min: 0.5, label: "strong" },
    { min: 0.3, label: "moderate" },
    { min: 0, label: "weak" },
  ],
  max_score: [
    { min: 0.8, label: "very strong" },
    { min: 0.5, label: "strong" },
    { min: 0.3, label: "moderate" },
    { min: 0, label: "weak" },
  ],
};

/** Render a numeric score with its human-readable meaning. */
function renderScore(score: number, scoreField?: string): string {
  const rounded = Math.round(score * 10000) / 10000;
  if (!scoreField) return `${rounded}`;
  const thresholds = SCORE_THRESHOLDS[scoreField];
  if (!thresholds) return `${rounded}`;
  for (const t of thresholds) {
    if (score >= t.min) return `${rounded} (${t.label})`;
  }
  return `${rounded}`;
}

/** Extract a short provenance string from edge properties. */
function extractProvenance(edgeProps: Record<string, unknown> | undefined): string {
  if (!edgeProps) return "";
  const parts: string[] = [];
  if (edgeProps.causality_level) parts.push(String(edgeProps.causality_level));
  if (edgeProps.mechanism_of_action) parts.push(String(edgeProps.mechanism_of_action));
  if (edgeProps.implication_mode) parts.push(String(edgeProps.implication_mode));
  if (edgeProps.variant_consequence) parts.push(String(edgeProps.variant_consequence));
  if (typeof edgeProps.evidence_count === "number" && edgeProps.evidence_count > 1) {
    parts.push(`${edgeProps.evidence_count} sources`);
  }
  if (typeof edgeProps.max_clinical_phase === "number") {
    parts.push(renderScore(edgeProps.max_clinical_phase, "max_clinical_phase"));
  }
  if (typeof edgeProps.l2g_score === "number") {
    parts.push(`L2G ${renderScore(edgeProps.l2g_score, "l2g_score")}`);
  }
  if (Array.isArray(edgeProps.sources) && edgeProps.sources.length > 0) {
    const names = edgeProps.sources as string[];
    parts.push(names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3}`);
  }
  return parts.join(" — ");
}

type Ent = Record<string, unknown>;

/** Build a markdown table from entities. Columns adapt to what data is present. */
function renderEntityTable(
  entities: Ent[],
  opts: { scoreField?: string; showProvenance?: boolean; showSupport?: boolean },
): string {
  if (entities.length === 0) return "";

  // Determine which optional columns have data
  const hasScore = entities.some((e) => typeof e.score === "number");
  const hasPValue = entities.some((e) => typeof e.pValue === "number");
  const hasFold = entities.some((e) => typeof e.foldEnrichment === "number");
  const hasSupport = opts.showSupport && entities.some((e) => typeof e.supportCount === "number");
  const hasProvenance = opts.showProvenance && entities.some((e) => e.edgeProperties);

  // Build header
  const cols: string[] = ["Name"];
  if (hasScore) cols.push("Score");
  if (hasPValue) cols.push("p-value");
  if (hasFold) cols.push("Fold");
  if (hasSupport) cols.push("Support");
  if (hasProvenance) cols.push("Evidence");
  cols.push("Subtitle");

  const header = `| ${cols.join(" | ")} |`;
  const sep = `|${cols.map(() => "---").join("|")}|`;

  const rows = entities.map((e) => {
    const cells: string[] = [String(e.label ?? e.id ?? "?")];
    if (hasScore) cells.push(typeof e.score === "number" ? renderScore(e.score, opts.scoreField) : "–");
    if (hasPValue) cells.push(typeof e.pValue === "number" ? e.pValue.toExponential(1) : "–");
    if (hasFold) cells.push(typeof e.foldEnrichment === "number" ? `${Math.round(e.foldEnrichment * 10) / 10}×` : "–");
    if (hasSupport) cells.push(typeof e.supportCount === "number" ? `${e.supportCount}` : "–");
    if (hasProvenance) cells.push(extractProvenance(e.edgeProperties as Record<string, unknown> | undefined));
    cells.push(truncateStr(String(e.subtitle ?? ""), 60) ?? "");
    return `| ${cells.join(" | ")} |`;
  });

  return [header, sep, ...rows].join("\n");
}
