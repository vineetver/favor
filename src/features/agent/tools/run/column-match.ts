/**
 * column-match.ts — Multi-signal column matching for cohort tools.
 *
 * Prevents the #1 cohort failure mode: LLM sends wrong column name -> 400 -> retry loop.
 * Instead: normalize -> synonym lookup -> multi-signal scoring -> auto-correct or ask user.
 */

import type { CohortSchemaCache } from "./schema-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnKind = "numeric" | "categorical" | "identity" | "array";

export interface ColumnMatch {
  column: string;
  score: number; // 0-1 composite
  kind: ColumnKind;
  signals: {
    levenshtein: number; // normalized 0-1 (1 = exact)
    token_jaccard: number;
    prefix_match: boolean;
    synonym_hit: boolean;
  };
}

export interface ColumnRecovery {
  input: string;
  best_match?: ColumnMatch;
  runner_up?: ColumnMatch;
  action: "exact" | "auto_corrected" | "needs_user";
  reason: string;
}

/** Context hint: what role the column is expected to play */
export interface ColumnRef {
  name: string;
  expectedKind?: ColumnKind;
  /** Where in the command this column was referenced (for error messages) */
  field_path?: string;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^(original_|variants_|favor_)/, "")
    .replace(/_(raw|score)$/, "")
    .replace(/^_|_$/g, "");
}

// ---------------------------------------------------------------------------
// Synonym map (hand-curated, small)
// ---------------------------------------------------------------------------

const COLUMN_SYNONYMS: Record<string, string> = {
  pval: "p_value",
  p: "p_value",
  cadd: "cadd_phred",
  af: "gnomad_af",
  allele_freq: "gnomad_af",
  maf: "gnomad_af",
  beta: "effect_size",
  or: "odds_ratio",
  se: "standard_error",
  chr: "chromosome",
  pos: "position",
  linsight_score: "linsight",
  revel_score: "revel",
  gerp_score: "gerp",
  dann_score: "dann",
  fathmm: "fathmm_xf",
  alphamissense: "alphamissense_score",
  phylop: "phylop_vertebrates",
  gnomad: "gnomad_af",
  gnomad_freq: "gnomad_af",
  consequence_type: "consequence",
  clin_sig: "clinical_significance",
  clinvar: "clinvar_significance",
};

// ---------------------------------------------------------------------------
// Role groups — prevent cross-role mismatches
// ---------------------------------------------------------------------------

const ROLE_GROUPS: Record<string, string[]> = {
  significance: ["p_value", "pval", "adjusted_p", "fdr", "bonferroni"],
  effect: ["beta", "effect_size", "odds_ratio", "log_or", "standard_error"],
  score: [
    "cadd_phred",
    "linsight",
    "revel",
    "gerp",
    "dann",
    "fathmm_xf",
    "alphamissense",
  ],
  frequency: [
    "gnomad_af",
    "af",
    "maf",
    "allele_frequency",
    "gnomad_exome_af",
    "gnomad_genome_af",
  ],
  position: [
    "chromosome",
    "position",
    "start",
    "end",
    "start_position",
    "end_position",
  ],
  conservation: [
    "phylop_primates",
    "phylop_mammals",
    "phylop_vertebrates",
    "phastcons",
  ],
};

function isRoleMismatch(input: string, candidate: string): boolean {
  const normInput = normalizeColumnName(input);
  const normCandidate = normalizeColumnName(candidate);

  const groups = Object.values(ROLE_GROUPS);
  let inputGroup: string[] | undefined;
  let candidateGroup: string[] | undefined;

  for (const members of groups) {
    if (members.some((m) => normInput.includes(m))) inputGroup = members;
    if (members.some((m) => normCandidate.includes(m)))
      candidateGroup = members;
  }

  // Mismatch only if both belong to different identified groups
  if (inputGroup && candidateGroup && inputGroup !== candidateGroup)
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

// ---------------------------------------------------------------------------
// Multi-signal scoring
// ---------------------------------------------------------------------------

function scoreColumnMatch(
  input: string,
  candidate: string,
  candidateKind: ColumnKind,
): ColumnMatch {
  const normInput = normalizeColumnName(input);
  const normCandidate = normalizeColumnName(candidate);

  // 1. Exact match after normalization
  if (normInput === normCandidate) {
    return {
      column: candidate,
      score: 1.0,
      kind: candidateKind,
      signals: {
        levenshtein: 1,
        token_jaccard: 1,
        prefix_match: true,
        synonym_hit: false,
      },
    };
  }

  // 2. Synonym match
  const synonymTarget = COLUMN_SYNONYMS[normInput];
  if (synonymTarget && normalizeColumnName(synonymTarget) === normCandidate) {
    return {
      column: candidate,
      score: 0.95,
      kind: candidateKind,
      signals: {
        levenshtein: 0.5,
        token_jaccard: 0.5,
        prefix_match: false,
        synonym_hit: true,
      },
    };
  }

  // 3. Token overlap (Jaccard on underscore-split tokens)
  const inputTokens = new Set(normInput.split("_").filter(Boolean));
  const candidateTokens = new Set(normCandidate.split("_").filter(Boolean));
  const intersection = [...inputTokens].filter((t) =>
    candidateTokens.has(t),
  ).length;
  const union = new Set([...inputTokens, ...candidateTokens]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // 4. Prefix match
  const prefixMatch =
    normCandidate.startsWith(normInput) || normInput.startsWith(normCandidate);

  // 5. Levenshtein similarity
  const maxLen = Math.max(normInput.length, normCandidate.length);
  const editDist = levenshtein(normInput, normCandidate);
  const levScore = maxLen > 0 ? 1 - editDist / maxLen : 0;

  // Composite: weighted combination
  const score = levScore * 0.3 + jaccard * 0.4 + (prefixMatch ? 0.2 : 0) + 0.1;

  return {
    column: candidate,
    score,
    kind: candidateKind,
    signals: {
      levenshtein: levScore,
      token_jaccard: jaccard,
      prefix_match: prefixMatch,
      synonym_hit: false,
    },
  };
}

function describeSignals(signals: ColumnMatch["signals"]): string {
  const parts: string[] = [];
  if (signals.synonym_hit) parts.push("synonym");
  if (signals.prefix_match) parts.push("prefix");
  if (signals.token_jaccard >= 0.5)
    parts.push(`tokens:${signals.token_jaccard.toFixed(2)}`);
  if (signals.levenshtein >= 0.7)
    parts.push(`lev:${signals.levenshtein.toFixed(2)}`);
  return parts.join(", ") || "low-confidence";
}

// ---------------------------------------------------------------------------
// Column recovery — auto-correct or ask user
// ---------------------------------------------------------------------------

export function recoverUnknownColumn(
  badColumn: string,
  schema: CohortSchemaCache,
  expectedKind?: ColumnKind,
): ColumnRecovery {
  // First check: is this an exact match?
  if (schema.allColumns.includes(badColumn)) {
    return { input: badColumn, action: "exact", reason: "Exact match" };
  }

  const candidates = schema.allColumnsWithKind.map((col) =>
    scoreColumnMatch(badColumn, col.name, col.kind),
  );
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];

  if (!best || best.score < 0.4) {
    return {
      input: badColumn,
      action: "needs_user",
      reason: "No close match found",
    };
  }

  // Safety checks — ALL must pass for auto-correct
  const canAutoCorrect =
    best.score >= 0.8 &&
    (!runnerUp || best.score - runnerUp.score >= 0.15) &&
    (!expectedKind || best.kind === expectedKind) &&
    !isRoleMismatch(badColumn, best.column);

  if (canAutoCorrect) {
    return {
      input: badColumn,
      best_match: best,
      action: "auto_corrected",
      reason: `${badColumn} -> ${best.column} (score: ${best.score.toFixed(2)}, ${describeSignals(best.signals)})`,
    };
  }

  // Ambiguous — return top candidates for user
  return {
    input: badColumn,
    best_match: best,
    runner_up: runnerUp,
    action: "needs_user",
    reason:
      best.score >= 0.6
        ? `Ambiguous: ${candidates
            .slice(0, 3)
            .map((c) => `${c.column} (${c.score.toFixed(2)})`)
            .join(", ")}`
        : "No confident match",
  };
}

// ---------------------------------------------------------------------------
// Extract column references from any RunCommand
// ---------------------------------------------------------------------------

export function extractColumnRefs(cmd: Record<string, unknown>): ColumnRef[] {
  const refs: ColumnRef[] = [];

  // rows: select, sort, filters[].field
  if (Array.isArray(cmd.select)) {
    for (const col of cmd.select) {
      if (typeof col === "string")
        refs.push({ name: col, field_path: "select" });
    }
  }
  if (typeof cmd.sort === "string") {
    refs.push({ name: cmd.sort, expectedKind: "numeric", field_path: "sort" });
  }

  // groupby: group_by, metrics
  if (typeof cmd.group_by === "string") {
    refs.push({ name: cmd.group_by, field_path: "group_by" });
  }
  if (Array.isArray(cmd.metrics)) {
    for (const m of cmd.metrics) {
      if (typeof m !== "string") continue;
      // "count" is a built-in aggregate — skip column validation
      if (m === "count") continue;
      // Strip aggregate prefix ("mean:cadd_phred" → "cadd_phred")
      const col = m.includes(":") ? m.split(":").slice(1).join(":") : m;
      if (col)
        refs.push({
          name: col,
          expectedKind: "numeric",
          field_path: "metrics",
        });
    }
  }

  // correlation: x, y
  if (typeof cmd.x === "string") {
    refs.push({ name: cmd.x, expectedKind: "numeric", field_path: "x" });
  }
  if (typeof cmd.y === "string") {
    refs.push({ name: cmd.y, expectedKind: "numeric", field_path: "y" });
  }

  // prioritize: criteria[].column
  if (Array.isArray(cmd.criteria)) {
    for (let i = 0; i < cmd.criteria.length; i++) {
      const c = cmd.criteria[i] as { column?: string };
      if (typeof c?.column === "string") {
        refs.push({
          name: c.column,
          expectedKind: "numeric",
          field_path: `criteria[${i}].column`,
        });
      }
    }
  }

  // compute: weights[].column
  if (Array.isArray(cmd.weights)) {
    for (let i = 0; i < cmd.weights.length; i++) {
      const w = cmd.weights[i] as { column?: string };
      if (typeof w?.column === "string") {
        refs.push({
          name: w.column,
          expectedKind: "numeric",
          field_path: `weights[${i}].column`,
        });
      }
    }
  }

  // filters: score_above/score_below field
  if (Array.isArray(cmd.filters)) {
    for (let i = 0; i < cmd.filters.length; i++) {
      const f = cmd.filters[i] as { type?: string; field?: string };
      if (
        (f?.type === "score_above" || f?.type === "score_below") &&
        typeof f.field === "string"
      ) {
        refs.push({
          name: f.field,
          expectedKind: "numeric",
          field_path: `filters[${i}].field`,
        });
      }
    }
  }

  // analytics: features.numeric, features.categorical, target.field, various column refs
  const params = cmd.params as Record<string, unknown> | undefined;
  if (params) {
    const features = params.features as
      | { numeric?: string[]; categorical?: string[] }
      | undefined;
    if (features?.numeric) {
      for (const col of features.numeric) {
        refs.push({
          name: col,
          expectedKind: "numeric",
          field_path: "params.features.numeric",
        });
      }
    }
    if (features?.categorical) {
      for (const col of features.categorical) {
        refs.push({
          name: col,
          expectedKind: "categorical",
          field_path: "params.features.categorical",
        });
      }
    }
    const target = params.target as { field?: string } | undefined;
    if (typeof target?.field === "string") {
      refs.push({ name: target.field, field_path: "params.target.field" });
    }
    // p_value_column, effect_size_column, se_column, time_column, event_column
    for (const key of [
      "p_value_column",
      "effect_size_column",
      "se_column",
      "time_column",
      "event_column",
      "x_column",
      "y_column",
    ] as const) {
      if (typeof params[key] === "string") {
        refs.push({
          name: params[key] as string,
          expectedKind: "numeric",
          field_path: `params.${key}`,
        });
      }
    }
    // columns (bootstrap_ci)
    if (Array.isArray(params.columns)) {
      for (const col of params.columns) {
        if (typeof col === "string")
          refs.push({
            name: col,
            expectedKind: "numeric",
            field_path: "params.columns",
          });
      }
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Apply corrections to a command in place
// ---------------------------------------------------------------------------

export function applyColumnCorrections(
  cmd: Record<string, unknown>,
  corrections: ColumnRecovery[],
): void {
  const correctionMap = new Map<string, string>();
  for (const c of corrections) {
    if (c.action === "auto_corrected" && c.best_match) {
      correctionMap.set(c.input, c.best_match.column);
    }
  }
  if (correctionMap.size === 0) return;

  const fix = (v: unknown): unknown => {
    if (typeof v === "string" && correctionMap.has(v))
      return correctionMap.get(v);
    return v;
  };

  // select
  if (Array.isArray(cmd.select)) {
    cmd.select = cmd.select.map(fix);
  }
  // sort
  if (typeof cmd.sort === "string") cmd.sort = fix(cmd.sort);
  // group_by
  if (typeof cmd.group_by === "string") cmd.group_by = fix(cmd.group_by);
  // x, y
  if (typeof cmd.x === "string") cmd.x = fix(cmd.x);
  if (typeof cmd.y === "string") cmd.y = fix(cmd.y);
  // criteria
  if (Array.isArray(cmd.criteria)) {
    for (const c of cmd.criteria) {
      const crit = c as { column?: string };
      if (typeof crit.column === "string")
        crit.column = fix(crit.column) as string;
    }
  }
  // weights
  if (Array.isArray(cmd.weights)) {
    for (const w of cmd.weights) {
      const wt = w as { column?: string };
      if (typeof wt.column === "string") wt.column = fix(wt.column) as string;
    }
  }
  // filters
  if (Array.isArray(cmd.filters)) {
    for (const f of cmd.filters) {
      const flt = f as { type?: string; field?: string };
      if (
        (flt.type === "score_above" || flt.type === "score_below") &&
        typeof flt.field === "string"
      ) {
        flt.field = fix(flt.field) as string;
      }
    }
  }
  // analytics params
  const params = cmd.params as Record<string, unknown> | undefined;
  if (params) {
    const features = params.features as
      | { numeric?: string[]; categorical?: string[] }
      | undefined;
    if (features?.numeric)
      features.numeric = features.numeric.map((c) => fix(c) as string);
    if (features?.categorical)
      features.categorical = features.categorical.map((c) => fix(c) as string);
    const target = params.target as { field?: string } | undefined;
    if (typeof target?.field === "string")
      target.field = fix(target.field) as string;
    for (const key of [
      "p_value_column",
      "effect_size_column",
      "se_column",
      "time_column",
      "event_column",
      "x_column",
      "y_column",
    ] as const) {
      if (typeof params[key] === "string") params[key] = fix(params[key]);
    }
    if (Array.isArray(params.columns)) {
      params.columns = (params.columns as string[]).map(
        (c) => fix(c) as string,
      );
    }
  }
}
