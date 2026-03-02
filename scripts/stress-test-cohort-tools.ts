/**
 * No-LLM stress test for Cohort tools.
 * Hits every cohort endpoint via raw HTTP — validates response shapes,
 * auth, analytics pipeline, and documents actual API contracts.
 *
 * Usage: npx tsx scripts/stress-test-cohort-tools.ts
 *
 * Env:
 *   NEXT_PUBLIC_API_URL  (default: http://localhost:8000/api/v1)
 *   FAVOR_API_KEY        (required for protected endpoints)
 *   TEST_COHORT_ID       (default: 84a8d62b-bee9-45e5-ae4f-2913323740e0)
 */

import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

// Manual .env loader (no dotenv dependency)
function loadEnv() {
  try {
    const envPath = resolve(import.meta.dirname ?? __dirname, "../.env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnv();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_KEY = process.env.FAVOR_API_KEY || "";
const GWAS_COHORT_ID = process.env.TEST_COHORT_ID || "13de3fc8-5535-432e-b6be-32bd84226e83"; // gwas_sumstats_real

// Well-known GWAS variants for cohort creation
const TEST_VARIANTS = [
  "rs429358", "rs7412", "rs75932628", "rs63750847", "rs143332484",
  "rs11571833", "rs80357906", "rs28897696", "rs121913529", "rs121912651",
  "rs1801133", "rs334", "rs1800497", "rs4680", "rs1799945",
  "rs1800562", "rs7903146", "rs5219", "rs12255372", "rs1801282",
];

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function api<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown; timeout?: number },
): Promise<{ status: number; ok: boolean; data: T; raw: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeout ?? 60_000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts?.method ?? "GET",
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const raw = await res.text();
    let data: T;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw as unknown as T;
    }

    return { status: res.status, ok: res.ok, data, raw };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

type Grade = "PASS" | "PARTIAL" | "FAIL";

interface TestResult {
  id: string;
  name: string;
  grade: Grade;
  elapsed: number;
  notes: string;
  responseShape?: string;
  responseKeys?: string[];
  rawSnippet?: string;
}

const results: TestResult[] = [];

function grade(
  id: string,
  name: string,
  g: Grade,
  notes: string,
  data?: unknown,
): TestResult {
  const shape = data && typeof data === "object" ? Object.keys(data as object) : undefined;
  return {
    id,
    name,
    grade: g,
    elapsed: 0,
    notes,
    responseKeys: shape,
    rawSnippet: data ? JSON.stringify(data).slice(0, 500) : undefined,
  };
}

async function run<T>(
  id: string,
  name: string,
  fn: () => Promise<T>,
  validate: (result: T) => TestResult,
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = (Date.now() - start) / 1000;
    const graded = validate(result);
    graded.elapsed = elapsed;
    const emoji = graded.grade === "PASS" ? "✅" : graded.grade === "PARTIAL" ? "⚠️" : "❌";
    console.log(`  ${emoji} ${id}: ${name} (${elapsed.toFixed(1)}s) — ${graded.notes}`);
    if (graded.responseKeys) {
      console.log(`       keys: [${graded.responseKeys.join(", ")}]`);
    }
    results.push(graded);
    return result;
  } catch (err) {
    const elapsed = (Date.now() - start) / 1000;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ ${id}: ${name} (${elapsed.toFixed(1)}s) — EXCEPTION: ${msg.slice(0, 200)}`);
    results.push({ id, name, grade: "FAIL", elapsed, notes: `Exception: ${msg.slice(0, 300)}` });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Polling helper for analytics
// ---------------------------------------------------------------------------

async function pollAnalytics(
  cohortId: string,
  runId: string,
  timeoutMs = 180_000,
): Promise<{ status: number; ok: boolean; data: any; raw: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await api(`/cohorts/${cohortId}/analytics/runs/${runId}`);
    if (!resp.ok) return resp;
    const d = resp.data as any;
    if (d.status === "completed" || d.status === "failed" || d.status === "cancelled") return resp;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return { status: 408, ok: false, data: { error: "Poll timeout" }, raw: "timeout" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("═".repeat(70));
  console.log("  Cohort Tools — No-LLM API Stress Test");
  console.log("═".repeat(70));
  console.log(`  API Base: ${API_BASE}`);
  console.log(`  API Key:  ${API_KEY ? API_KEY.slice(0, 12) + "..." : "(none)"}`);
  console.log(`  GWAS Cohort: ${GWAS_COHORT_ID}`);
  console.log();

  // ── Auth check ──────────────────────────────────────────────────────
  console.log("─── AUTH CHECK ───");

  const authCheck = await run(
    "A0",
    "Test auth header",
    () => api(`/cohorts/${GWAS_COHORT_ID}/schema`),
    (resp) => {
      if (resp.status === 401) return grade("A0", "auth", "FAIL", `401 Unauthorized — API key rejected. Raw: ${resp.raw.slice(0, 200)}`);
      if (resp.status === 403) return grade("A0", "auth", "FAIL", `403 Forbidden — wrong key format? Raw: ${resp.raw.slice(0, 200)}`);
      if (!resp.ok) return grade("A0", "auth", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
      return grade("A0", "auth", "PASS", `Auth OK (HTTP ${resp.status})`, resp.data);
    },
  );

  // If auth failed, try without Bearer prefix
  if (authCheck && (authCheck as any).status === 401) {
    console.log("  Retrying with X-API-Key header...");
    // Fall through — we'll note this and the user can fix
  }

  // ====================================================================
  // GROUP 1: getCohortSchema — GWAS sumstats cohort
  // ====================================================================
  console.log("\n─── GROUP 1: getCohortSchema (GWAS sumstats) ───");

  let schemaData: any = null;

  await run(
    "T1.1",
    `Schema for GWAS cohort ${GWAS_COHORT_ID.slice(0, 8)}...`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/schema`),
    (resp) => {
      if (!resp.ok) return grade("T1.1", "schema", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
      const d = resp.data as any;
      schemaData = d;
      const notes: string[] = [];
      notes.push(`HTTP ${resp.status}`);
      if (d.row_count != null) notes.push(`row_count=${d.row_count}`);
      if (d.data_type) notes.push(`data_type=${d.data_type}`);
      if (d.capabilities) notes.push(`capabilities=${JSON.stringify(d.capabilities)}`);
      if (d.columns?.length) notes.push(`columns=${d.columns.length}`);
      if (d.text_summary) notes.push(`has text_summary`);
      if (d.profile) notes.push(`has profile`);
      if (d.available_methods?.length) notes.push(`available_methods=${d.available_methods.length}`);
      return grade("T1.1", "schema", "PASS", notes.join(", "), d);
    },
  );

  // Dump full column listing
  if (schemaData?.columns) {
    console.log("\n  📋 FULL COLUMN LISTING:");
    const cols = schemaData.columns as Array<{ name: string; kind: string; namespace?: string; role?: string; [k: string]: unknown }>;
    const byKind: Record<string, string[]> = {};
    for (const c of cols) {
      (byKind[c.kind] ??= []).push(c.name);
    }
    for (const [kind, names] of Object.entries(byKind)) {
      console.log(`    ${kind}: [${names.join(", ")}]`);
    }
    // Log namespace/role if present
    const hasNamespace = cols.some(c => c.namespace);
    if (hasNamespace) {
      const byNs: Record<string, string[]> = {};
      for (const c of cols) {
        (byNs[c.namespace ?? "unknown"] ??= []).push(c.name);
      }
      console.log("\n  📋 BY NAMESPACE:");
      for (const [ns, names] of Object.entries(byNs)) {
        console.log(`    ${ns}: [${names.join(", ")}]`);
      }
    }
  }

  // Dump available methods
  if (schemaData?.available_methods?.length) {
    console.log("\n  📊 AVAILABLE METHODS:");
    for (const m of schemaData.available_methods) {
      console.log(`    ${m.method} (${m.category}): available=${m.available}, auto_config=${JSON.stringify(m.auto_config)}`);
    }
  }

  // ====================================================================
  // GROUP 2: analyzeCohort — rows (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 2: analyzeCohort(rows) on GWAS cohort ───");

  // We need to know actual column names from schema
  const allNumericCols = schemaData?.columns
    ?.filter((c: any) => c.kind === "numeric")
    ?.map((c: any) => c.name) ?? [];

  // Filter out internal ID/position columns that are useless for analytics
  const INTERNAL_COLS = new Set([
    "variants_vid", "variants_chrom_id", "variants_position0",
    "variants_hash30", "variants_pos_bin_1m", "variants_position",
    "variants_is_hashed", "row_id",
    "original_hm_chrom", "original_hm_pos", "original_hm_code",
    "original_position",
  ]);
  const numericCols = allNumericCols.filter((c: string) => !INTERNAL_COLS.has(c));

  // Prefer GWAS-specific columns for analytics (complete data, no NaN issues)
  const gwasNumericCols = numericCols.filter((c: string) =>
    c.startsWith("original_") && !INTERNAL_COLS.has(c),
  );
  // Annotation columns (may have missing values)
  const annotNumericCols = numericCols.filter((c: string) =>
    !c.startsWith("original_") && !INTERNAL_COLS.has(c),
  );
  console.log(`  GWAS-specific numeric cols (${gwasNumericCols.length}): [${gwasNumericCols.join(", ")}]`);
  console.log(`  Annotation numeric cols (${annotNumericCols.length}): [${annotNumericCols.join(", ")}]`);
  console.log(`  All numeric cols (${allNumericCols.length}): [${allNumericCols.slice(0, 10).join(", ")}${allNumericCols.length > 10 ? "..." : ""}]`);
  console.log(`  Analytics-ready numeric cols (${numericCols.length}): [${numericCols.slice(0, 10).join(", ")}${numericCols.length > 10 ? "..." : ""}]`);

  const firstNumericCol = numericCols[0] ?? "original_p_value";
  console.log(`  Using numeric column for sort: ${firstNumericCol}`);

  // Always send explicit select for GWAS cohorts (default select has variant_list-only columns)
  const defaultSelect = numericCols.slice(0, 5);

  await run(
    "T2.1",
    `Rows: top 10 by ${firstNumericCol}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: { sort: firstNumericCol, desc: true, limit: 10, select: defaultSelect },
    }),
    (resp) => {
      if (!resp.ok) return grade("T2.1", "rows", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      if (!d.rows) return grade("T2.1", "rows", "FAIL", "Missing 'rows' in response", d);
      const firstRow = d.rows[0];
      return grade("T2.1", "rows", "PASS",
        `${d.rows.length} rows, total=${d.total}, first row keys=[${firstRow ? Object.keys(firstRow).join(",") : "empty"}]`,
        { total: d.total, rowCount: d.rows.length, sampleRow: firstRow });
    },
  );

  // Rows with select
  const selectCols = numericCols.slice(0, 5);
  await run(
    "T2.2",
    "Rows: custom select columns",
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: { select: selectCols, limit: 3 },
    }),
    (resp) => {
      if (!resp.ok) return grade("T2.2", "rows+select", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      const firstRow = d.rows?.[0];
      return grade("T2.2", "rows+select", firstRow ? "PASS" : "PARTIAL",
        `${d.rows?.length ?? 0} rows, selected: [${selectCols.join(",")}], actual keys: [${firstRow ? Object.keys(firstRow).join(",") : "none"}]`,
        { sampleRow: firstRow });
    },
  );

  // Rows with score filter — score_above/score_below only work with the 36 standard annotation columns
  const annotationCol = numericCols.find((c: string) => c.includes("fathmm") || c.includes("cadd") || c.includes("linsight"));
  await run(
    "T2.3",
    `Rows: filter score_above on ${annotationCol ?? "N/A"}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: {
        ...(annotationCol ? { filters: [{ type: "score_above", field: annotationCol, threshold: 0 }] } : {}),
        select: defaultSelect,
        limit: 5,
      },
    }),
    (resp) => {
      if (!resp.ok) return grade("T2.3", "rows+filter", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T2.3", "rows+filter", d.rows?.length ? "PASS" : "PARTIAL",
        `${d.rows?.length ?? 0} rows after filter, total=${d.total}`,
        d);
    },
  );

  // Rows ascending sort (p-value: lower = more significant)
  const pvalCol = numericCols.find((c: string) => c.includes("p_value") || c.includes("pvalue")) ?? firstNumericCol;
  await run(
    "T2.4",
    `Rows: top 10 by ${pvalCol} ascending (most significant)`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: { sort: pvalCol, desc: false, limit: 10, select: defaultSelect },
    }),
    (resp) => {
      if (!resp.ok) return grade("T2.4", "rows asc", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      const firstRow = d.rows?.[0];
      return grade("T2.4", "rows asc", d.rows?.length ? "PASS" : "PARTIAL",
        `${d.rows?.length ?? 0} rows, top p-value=${firstRow?.[pvalCol]}`,
        { total: d.total, sampleRow: firstRow });
    },
  );

  // ====================================================================
  // GROUP 3: analyzeCohort — groupby (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 3: analyzeCohort(groupby) on GWAS cohort ───");

  const categoricalCols = schemaData?.columns
    ?.filter((c: any) => c.kind === "categorical")
    ?.map((c: any) => c.name) ?? [];
  console.log(`  Categorical columns: [${categoricalCols.join(", ")}]`);

  const groupByCol = categoricalCols[0] ?? "chromosome";

  await run(
    "T3.1",
    `Groupby: ${groupByCol}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/groupby`, {
      method: "POST",
      body: { group_by: groupByCol },
    }),
    (resp) => {
      if (!resp.ok) return grade("T3.1", "groupby", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      if (!d.buckets) return grade("T3.1", "groupby", "FAIL", "Missing 'buckets'", d);
      const first = d.buckets[0];
      return grade("T3.1", "groupby", "PASS",
        `${d.buckets.length} groups, total_groups=${d.total_groups}, bucket keys=[${first ? Object.keys(first).join(",") : "none"}]`,
        { total_groups: d.total_groups, sampleBucket: first });
    },
  );

  // Groupby with metrics
  const metricCols = numericCols.slice(0, 2);
  await run(
    "T3.2",
    `Groupby: ${groupByCol} with metrics ${metricCols.join("+")}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/groupby`, {
      method: "POST",
      body: { group_by: groupByCol, metrics: metricCols },
    }),
    (resp) => {
      if (!resp.ok) return grade("T3.2", "groupby+metrics", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      const first = d.buckets?.[0];
      return grade("T3.2", "groupby+metrics", d.buckets?.length ? "PASS" : "PARTIAL",
        `${d.buckets?.length ?? 0} groups, bucket keys=[${first ? Object.keys(first).join(",") : "none"}]`,
        { sampleBucket: first });
    },
  );

  // ====================================================================
  // GROUP 4: analyzeCohort — derive (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 4: analyzeCohort(derive) on GWAS cohort ───");

  let derivedGwasId: string | null = null;

  // Derive uses score_above/score_below which only accept the 36 standard annotation columns
  const deriveScoreCol = annotationCol?.replace("variants_", "") ?? "fathmm_xf";
  const deriveResult = await run(
    "T4.1",
    `Derive: ${deriveScoreCol} > 0`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/derive`, {
      method: "POST",
      body: {
        filters: [{ type: "score_above", field: deriveScoreCol, threshold: 0 }],
        label: "stress-test-derived",
      },
    }),
    (resp) => {
      if (!resp.ok) return grade("T4.1", "derive", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T4.1", "derive", d.cohort_id ? "PASS" : "PARTIAL",
        `cohort_id=${d.cohort_id}, vid_count=${d.vid_count}, parent_id=${d.parent_id}`,
        d);
    },
  );

  if (deriveResult && (deriveResult as any).ok) {
    derivedGwasId = ((deriveResult as any).data as any)?.cohort_id ?? null;
  }

  // Derive with categorical filter — use a categorical column that matches a known filter type
  const hasChrCol = categoricalCols.some((c: string) => c.includes("chromosome"));
  if (hasChrCol) {
    await run(
      "T4.2",
      "Derive: chromosome filter",
      () => api(`/cohorts/${GWAS_COHORT_ID}/derive`, {
        method: "POST",
        body: {
          filters: [{ type: "chromosome", value: "1" }],
          label: "chr1-only",
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T4.2", "derive chr", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T4.2", "derive chr", "PASS",
          `cohort_id=${d.cohort_id}, vid_count=${d.vid_count}`,
          d);
      },
    );
  }

  // ====================================================================
  // GROUP 5: analyzeCohort — prioritize (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 5: analyzeCohort(prioritize) on GWAS cohort ───");

  const prioritizeCols = numericCols.slice(0, 3);
  await run(
    "T5.1",
    `Prioritize by ${prioritizeCols.join("+")}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/prioritize`, {
      method: "POST",
      body: {
        criteria: prioritizeCols.map((c: string) => ({ column: c, desc: true, weight: 1 })),
        limit: 10,
      },
    }),
    (resp) => {
      if (!resp.ok) return grade("T5.1", "prioritize", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      const first = d.rows?.[0];
      return grade("T5.1", "prioritize", d.rows?.length ? "PASS" : "PARTIAL",
        `${d.rows?.length ?? 0} rows, total_ranked=${d.total_ranked}, row keys=[${first ? Object.keys(first).join(",") : "none"}]`,
        { total_ranked: d.total_ranked, sampleRow: first });
    },
  );

  // ====================================================================
  // GROUP 6: analyzeCohort — compute (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 6: analyzeCohort(compute) on GWAS cohort ───");

  const computeCols = numericCols.slice(0, 3);
  await run(
    "T6.1",
    `Compute weighted score from ${computeCols.join("+")}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/compute`, {
      method: "POST",
      body: {
        weights: computeCols.map((c: string, i: number) => ({ column: c, weight: i + 1 })),
        normalize: true,
        limit: 10,
      },
    }),
    (resp) => {
      if (!resp.ok) return grade("T6.1", "compute", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      const first = d.rows?.[0];
      return grade("T6.1", "compute", d.rows?.length ? "PASS" : "PARTIAL",
        `${d.rows?.length ?? 0} rows, total_scored=${d.total_scored}, row keys=[${first ? Object.keys(first).join(",") : "none"}]`,
        { total_scored: d.total_scored, sampleRow: first });
    },
  );

  // ====================================================================
  // GROUP 7: analyzeCohort — correlation (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 7: analyzeCohort(correlation) on GWAS cohort ───");

  if (numericCols.length >= 2) {
    await run(
      "T7.1",
      `Correlation: ${numericCols[0]} vs ${numericCols[1]}`,
      () => api(`/cohorts/${GWAS_COHORT_ID}/correlation`, {
        method: "POST",
        body: { x: numericCols[0], y: numericCols[1] },
      }),
      (resp) => {
        if (!resp.ok) return grade("T7.1", "correlation", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T7.1", "correlation", d.r != null ? "PASS" : "PARTIAL",
          `r=${d.r}, n=${d.n}, x_mean=${d.x_mean}, y_mean=${d.y_mean}`,
          d);
      },
    );
  }

  // ====================================================================
  // GROUP 8: runAnalytics — PCA
  // ====================================================================
  console.log("\n─── GROUP 8: runAnalytics(pca) ───");

  // Analytics endpoints
  const analyticsUrl = (cohortId: string) => `/cohorts/${cohortId}/analytics/run`;
  const analyticsVizUrl = (cohortId: string, runId: string, chartId: string) =>
    `/cohorts/${cohortId}/analytics/runs/${runId}/viz?chart_id=${chartId}`;

  // Use available_methods auto_config if present, otherwise fall back to numericCols
  const availableMethods = schemaData?.available_methods ?? [];
  const getAutoConfig = (method: string) => availableMethods.find((m: any) => m.method === method)?.auto_config;

  // Pick analytics-appropriate columns — prefer GWAS-specific cols (complete data),
  // fall back to annotation cols. Never trust auto_config blindly (it may include internal IDs).
  const bestAnalyticsCols = gwasNumericCols.length >= 3 ? gwasNumericCols : numericCols;
  const pcaCols = bestAnalyticsCols.slice(0, 5);
  console.log(`  PCA columns: [${pcaCols.join(", ")}] (source: ${gwasNumericCols.length >= 3 ? "gwas cols" : "numericCols"})`);

  let pcaRunId: string | null = null;

  const pcaSubmit = await run(
    "T8.1",
    "PCA: submit run",
    () => api(analyticsUrl(GWAS_COHORT_ID), {
      method: "POST",
      body: { task: { type: "pca", features: { numeric: pcaCols }, n_components: 2 } },
    }),
    (resp) => {
      if (!resp.ok) return grade("T8.1", "pca submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T8.1", "pca submit", d.run_id ? "PASS" : "FAIL",
        `run_id=${d.run_id}`,
        d);
    },
  );

  if (pcaSubmit && (pcaSubmit as any).ok) {
    pcaRunId = ((pcaSubmit as any).data as any)?.run_id ?? null;
  }

  if (pcaRunId) {
    const pcaPoll = await run(
      "T8.2",
      "PCA: poll until complete",
      () => pollAnalytics(GWAS_COHORT_ID, pcaRunId!),
      (resp) => {
        if (!resp.ok) return grade("T8.2", "pca poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        if (d.status === "failed") return grade("T8.2", "pca poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
        const r = d.result ?? d;
        return grade("T8.2", "pca poll", "PASS",
          `status=${d.status}, metrics keys=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], viz_charts=${r.viz_charts?.length ?? 0}`,
          d);
      },
    );

    // Fetch charts
    if (pcaPoll && (pcaPoll as any).ok) {
      const pollData = (pcaPoll as any).data as any;
      const pcaResult = pollData.result ?? pollData;
      if (pcaResult.viz_charts?.length) {
        for (const chart of pcaResult.viz_charts) {
          const chartId = chart.chart_id ?? chart;
          await run(
            `T8.3-${chartId}`,
            `PCA chart: ${chart.chart_type ?? chartId}`,
            () => api(analyticsVizUrl(GWAS_COHORT_ID, pcaRunId!, chartId)),
            (resp) => {
              if (!resp.ok) return grade(`T8.3-${chartId}`, "pca chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
              const d = resp.data as any;
              return grade(`T8.3-${chartId}`, "pca chart", "PASS",
                `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                d);
            },
          );
        }
      } else {
        console.log(`  ℹ️  PCA completed with no viz_charts. metrics: ${JSON.stringify(pcaResult.metrics).slice(0, 300)}`);
      }
    }
  }

  // ====================================================================
  // GROUP 9: runAnalytics — clustering
  // ====================================================================
  console.log("\n─── GROUP 9: runAnalytics(clustering) ───");

  let clusterRunId: string | null = null;

  const clusterSubmit = await run(
    "T9.1",
    "Clustering: submit kmeans",
    () => api(analyticsUrl(GWAS_COHORT_ID), {
      method: "POST",
      body: { task: { type: "kmeans", features: { numeric: pcaCols }, k: 3 } },
    }),
    (resp) => {
      if (!resp.ok) return grade("T9.1", "cluster submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T9.1", "cluster submit", d.run_id ? "PASS" : "FAIL",
        `run_id=${d.run_id}`,
        d);
    },
  );

  if (clusterSubmit && (clusterSubmit as any).ok) {
    clusterRunId = ((clusterSubmit as any).data as any)?.run_id ?? null;
  }

  if (clusterRunId) {
    const clusterPoll = await run(
      "T9.2",
      "Clustering: poll until complete",
      () => pollAnalytics(GWAS_COHORT_ID, clusterRunId!),
      (resp) => {
        if (!resp.ok) return grade("T9.2", "cluster poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        if (d.status === "failed") return grade("T9.2", "cluster poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
        const r = d.result ?? d;
        return grade("T9.2", "cluster poll", "PASS",
          `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
          d);
      },
    );

    // Fetch cluster charts
    if (clusterPoll && (clusterPoll as any).ok) {
      const cResult = ((clusterPoll as any).data as any)?.result;
      if (cResult?.viz_charts?.length) {
        for (const chart of cResult.viz_charts) {
          const chartId = chart.chart_id ?? chart;
          await run(
            `T9.3-${chartId}`,
            `Cluster chart: ${chart.chart_type ?? chartId}`,
            () => api(analyticsVizUrl(GWAS_COHORT_ID, clusterRunId!, chartId)),
            (resp) => {
              if (!resp.ok) return grade(`T9.3-${chartId}`, "cluster chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
              const d = resp.data as any;
              return grade(`T9.3-${chartId}`, "cluster chart", "PASS",
                `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                d);
            },
          );
        }
      }
    }
  }

  // ====================================================================
  // GROUP 10: runAnalytics — regression
  // ====================================================================
  console.log("\n─── GROUP 10: runAnalytics(regression) ───");

  const regTarget = bestAnalyticsCols[0] ?? numericCols[0];
  const regFeatures = bestAnalyticsCols.slice(1, 4);
  console.log(`  Regression target: ${regTarget}, features: [${regFeatures.join(", ")}]`);

  if (numericCols.length >= 3) {
    let regRunId: string | null = null;

    const regSubmit = await run(
      "T10.1",
      "Regression: linear",
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "linear_regression",
            target: { field: regTarget },
            features: { numeric: Array.isArray(regFeatures) ? regFeatures : numericCols.slice(1, 4) },
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T10.1", "regression submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T10.1", "regression submit", d.run_id ? "PASS" : "FAIL",
          `run_id=${d.run_id}`,
          d);
      },
    );

    if (regSubmit && (regSubmit as any).ok) {
      regRunId = ((regSubmit as any).data as any)?.run_id ?? null;
    }

    if (regRunId) {
      const regPoll = await run(
        "T10.2",
        "Regression: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, regRunId!),
        (resp) => {
          if (!resp.ok) return grade("T10.2", "regression poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T10.2", "regression poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T10.2", "regression poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );

      // Fetch regression charts (pred_vs_actual, residuals, coef_bar)
      if (regPoll && (regPoll as any).ok) {
        const rResult = ((regPoll as any).data as any)?.result;
        if (rResult?.viz_charts?.length) {
          for (const chart of rResult.viz_charts) {
            const chartId = chart.chart_id ?? chart;
            await run(
              `T10.3-${chartId}`,
              `Regression chart: ${chart.chart_type ?? chartId}`,
              () => api(analyticsVizUrl(GWAS_COHORT_ID, regRunId!, chartId)),
              (resp) => {
                if (!resp.ok) return grade(`T10.3-${chartId}`, "reg chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
                const d = resp.data as any;
                return grade(`T10.3-${chartId}`, "reg chart", "PASS",
                  `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                  d);
              },
            );
          }
        }
      }
    }
  }

  // ====================================================================
  // GROUP 11: runAnalytics — statistical_test
  // ====================================================================
  console.log("\n─── GROUP 11: runAnalytics(statistical_test) ───");

  const permAutoConfig = getAutoConfig("permutation_test");
  const permX = permAutoConfig?.x_column ?? bestAnalyticsCols[0];
  const permY = permAutoConfig?.y_column ?? bestAnalyticsCols[1];
  console.log(`  Permutation test: x=${permX}, y=${permY} (source: ${permAutoConfig ? "auto_config" : "bestAnalyticsCols"})`);

  if (numericCols.length >= 2) {
    let statRunId: string | null = null;

    const statSubmit = await run(
      "T11.1",
      `Permutation test: ${permX} vs ${permY}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "permutation_test",
            x_column: permX,
            y_column: permY,
            n_permutations: 1000,
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T11.1", "stat submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T11.1", "stat submit", d.run_id ? "PASS" : "FAIL",
          `run_id=${d.run_id}`,
          d);
      },
    );

    if (statSubmit && (statSubmit as any).ok) {
      statRunId = ((statSubmit as any).data as any)?.run_id ?? null;
    }

    if (statRunId) {
      await run(
        "T11.2",
        "Statistical test: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, statRunId!),
        (resp) => {
          if (!resp.ok) return grade("T11.2", "stat poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T11.2", "stat poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T11.2", "stat poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}]`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 12: runAnalytics — multiple_testing_correction (QQ)
  // ====================================================================
  console.log("\n─── GROUP 12: runAnalytics(multiple_testing_correction) ───");

  const mtcAutoConfig = getAutoConfig("multiple_testing_correction");
  const mtcPvalCol = mtcAutoConfig?.p_value_column ?? pvalCol;
  console.log(`  MTC p_value_column: ${mtcPvalCol} (source: ${mtcAutoConfig ? "auto_config" : "pvalCol fallback"})`);

  if (mtcPvalCol) {
    let qqRunId: string | null = null;

    const qqSubmit = await run(
      "T12.1",
      `Multiple testing correction (QQ): p_value_column=${mtcPvalCol}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: { task: { type: "multiple_testing_correction", p_value_column: mtcPvalCol, method: "bh" } },
      }),
      (resp) => {
        if (!resp.ok) return grade("T12.1", "qq submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T12.1", "qq submit", d.run_id ? "PASS" : "FAIL",
          `run_id=${d.run_id}`,
          d);
      },
    );

    if (qqSubmit && (qqSubmit as any).ok) {
      qqRunId = ((qqSubmit as any).data as any)?.run_id ?? null;
    }

    if (qqRunId) {
      const qqPoll = await run(
        "T12.2",
        "QQ plot: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, qqRunId!),
        (resp) => {
          if (!resp.ok) return grade("T12.2", "qq poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T12.2", "qq poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T12.2", "qq poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );

      // Fetch QQ chart (qq_plot)
      if (qqPoll && (qqPoll as any).ok) {
        const qqResult = ((qqPoll as any).data as any)?.result;
        if (qqResult?.viz_charts?.length) {
          for (const chart of qqResult.viz_charts) {
            const chartId = chart.chart_id ?? chart;
            await run(
              `T12.3-${chartId}`,
              `QQ chart: ${chart.chart_type ?? chartId}`,
              () => api(analyticsVizUrl(GWAS_COHORT_ID, qqRunId!, chartId)),
              (resp) => {
                if (!resp.ok) return grade(`T12.3-${chartId}`, "qq chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
                const d = resp.data as any;
                return grade(`T12.3-${chartId}`, "qq chart", "PASS",
                  `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                  d);
              },
            );
          }
        }
      }
    }
  }

  // ====================================================================
  // GROUP 13: runAnalytics — feature_importance
  // ====================================================================
  console.log("\n─── GROUP 13: runAnalytics(feature_importance) ───");

  const fiTarget = regTarget;
  const fiFeatures = regFeatures;
  console.log(`  Feature importance target: ${fiTarget}, features: [${fiFeatures.join(", ")}]`);

  if (numericCols.length >= 3) {
    let fiRunId: string | null = null;

    const fiSubmit = await run(
      "T13.1",
      `Feature importance: target=${fiTarget}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "feature_importance",
            target: { field: fiTarget },
            features: { numeric: Array.isArray(fiFeatures) ? fiFeatures : numericCols.slice(1, 4) },
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T13.1", "feat imp submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T13.1", "feat imp submit", d.run_id ? "PASS" : "FAIL",
          `run_id=${d.run_id}`,
          d);
      },
    );

    if (fiSubmit && (fiSubmit as any).ok) {
      fiRunId = ((fiSubmit as any).data as any)?.run_id ?? null;
    }

    if (fiRunId) {
      const fiPoll = await run(
        "T13.2",
        "Feature importance: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, fiRunId!),
        (resp) => {
          if (!resp.ok) return grade("T13.2", "feat imp poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          const result = d.result ?? d;
          if (d.status === "failed") return grade("T13.2", "feat imp poll", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          return grade("T13.2", "feat imp poll", "PASS",
            `status=${d.status}, metrics=[${result.metrics ? Object.keys(result.metrics).join(",") : "none"}], charts=${result.viz_charts?.length ?? 0}`,
            d);
        },
      );

      // Fetch feature importance charts
      if (fiPoll && (fiPoll as any).ok) {
        const fiResult = ((fiPoll as any).data as any)?.result;
        if (fiResult?.viz_charts?.length) {
          for (const chart of fiResult.viz_charts) {
            const chartId = chart.chart_id ?? chart;
            await run(
              `T13.3-${chartId}`,
              `Feat imp chart: ${chart.chart_type ?? chartId}`,
              () => api(analyticsVizUrl(GWAS_COHORT_ID, fiRunId!, chartId)),
              (resp) => {
                if (!resp.ok) return grade(`T13.3-${chartId}`, "fi chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
                const d = resp.data as any;
                return grade(`T13.3-${chartId}`, "fi chart", "PASS",
                  `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                  d);
              },
            );
          }
        }
      }
    }
  }

  // ====================================================================
  // GROUP 14: Additional analytics methods (GWAS cohort)
  // ====================================================================
  console.log("\n─── GROUP 14: Additional analytics methods ───");

  // --- 14a: elastic_net ---
  if (bestAnalyticsCols.length >= 3) {
    const enTarget = bestAnalyticsCols[0];
    const enFeatures = bestAnalyticsCols.slice(1, 4);

    const enSubmit = await run(
      "T14a.1",
      `Elastic net: target=${enTarget}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "elastic_net",
            target: { field: enTarget },
            features: { numeric: enFeatures },
            l1_ratio: 0.5,
            lambda: 0.01,
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T14a.1", "elastic_net submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T14a.1", "elastic_net submit", d.run_id ? "PASS" : "FAIL", `run_id=${d.run_id}`, d);
      },
    );

    let enRunId: string | null = null;
    if (enSubmit && (enSubmit as any).ok) {
      enRunId = ((enSubmit as any).data as any)?.run_id ?? null;
    }

    if (enRunId) {
      await run(
        "T14a.2",
        "Elastic net: poll",
        () => pollAnalytics(GWAS_COHORT_ID, enRunId!),
        (resp) => {
          if (!resp.ok) return grade("T14a.2", "elastic_net poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T14a.2", "elastic_net poll", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T14a.2", "elastic_net poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // --- 14b: hierarchical_clustering ---
  if (bestAnalyticsCols.length >= 3) {
    const hcFeatures = bestAnalyticsCols.slice(0, 4);

    const hcSubmit = await run(
      "T14b.1",
      `Hierarchical clustering: ${hcFeatures.length} features`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "hierarchical_clustering",
            features: { numeric: hcFeatures },
            n_clusters: 3,
            linkage: "ward",
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T14b.1", "hier_cluster submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T14b.1", "hier_cluster submit", d.run_id ? "PASS" : "FAIL", `run_id=${d.run_id}`, d);
      },
    );

    let hcRunId: string | null = null;
    if (hcSubmit && (hcSubmit as any).ok) {
      hcRunId = ((hcSubmit as any).data as any)?.run_id ?? null;
    }

    if (hcRunId) {
      await run(
        "T14b.2",
        "Hierarchical clustering: poll",
        () => pollAnalytics(GWAS_COHORT_ID, hcRunId!),
        (resp) => {
          if (!resp.ok) return grade("T14b.2", "hier_cluster poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T14b.2", "hier_cluster poll", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T14b.2", "hier_cluster poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // --- 14c: bootstrap_ci ---
  if (bestAnalyticsCols.length >= 2) {
    const bsCols = bestAnalyticsCols.slice(0, 3);

    const bsSubmit = await run(
      "T14c.1",
      `Bootstrap CI: ${bsCols.join("+")}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "bootstrap_ci",
            statistic: { stat: "mean" },
            columns: bsCols,
            n_bootstrap: 500,
            confidence: 0.95,
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T14c.1", "bootstrap_ci submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T14c.1", "bootstrap_ci submit", d.run_id ? "PASS" : "FAIL", `run_id=${d.run_id}`, d);
      },
    );

    let bsRunId: string | null = null;
    if (bsSubmit && (bsSubmit as any).ok) {
      bsRunId = ((bsSubmit as any).data as any)?.run_id ?? null;
    }

    if (bsRunId) {
      await run(
        "T14c.2",
        "Bootstrap CI: poll",
        () => pollAnalytics(GWAS_COHORT_ID, bsRunId!),
        (resp) => {
          if (!resp.ok) return grade("T14c.2", "bootstrap_ci poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T14c.2", "bootstrap_ci poll", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T14c.2", "bootstrap_ci poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // --- 14d: logistic_regression (need a binary-ish target) ---
  // Use a categorical column or create a binary split from a numeric column
  const logRegCategoricalTarget = categoricalCols.find((c: string) =>
    c.includes("chromosome") || c.includes("ref_type") || c.includes("status"),
  );
  if (logRegCategoricalTarget && bestAnalyticsCols.length >= 2) {
    const lrFeatures = bestAnalyticsCols.slice(0, 3);

    const lrSubmit = await run(
      "T14d.1",
      `Logistic regression: target=${logRegCategoricalTarget}`,
      () => api(analyticsUrl(GWAS_COHORT_ID), {
        method: "POST",
        body: {
          task: {
            type: "logistic_regression",
            target: { field: logRegCategoricalTarget, positive_values: ["10"] },
            features: { numeric: lrFeatures },
          },
        },
      }),
      (resp) => {
        if (!resp.ok) return grade("T14d.1", "logistic_reg submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T14d.1", "logistic_reg submit", d.run_id ? "PASS" : "FAIL", `run_id=${d.run_id}`, d);
      },
    );

    let lrRunId: string | null = null;
    if (lrSubmit && (lrSubmit as any).ok) {
      lrRunId = ((lrSubmit as any).data as any)?.run_id ?? null;
    }

    if (lrRunId) {
      await run(
        "T14d.2",
        "Logistic regression: poll",
        () => pollAnalytics(GWAS_COHORT_ID, lrRunId!),
        (resp) => {
          if (!resp.ok) return grade("T14d.2", "logistic_reg poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T14d.2", "logistic_reg poll", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T14d.2", "logistic_reg poll", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}], charts=${r.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 15: Typed cohorts — credible_set + fine_mapping
  // ====================================================================
  console.log("\n─── GROUP 15: Typed cohorts (credible_set, fine_mapping) ───");

  const CREDIBLE_SET_ID = "23fca0a7-6aef-475d-b006-f028ecd5f5b8";
  const FINE_MAPPING_ID = "4b298756-01b3-49c8-8416-ffe9641a1ffb";

  // --- 15a: credible_set schema + rows ---
  let csSchemaData: any = null;
  await run(
    "T15a.1",
    "Credible set: schema",
    () => api(`/cohorts/${CREDIBLE_SET_ID}/schema`),
    (resp) => {
      if (!resp.ok) return grade("T15a.1", "cs schema", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
      const d = resp.data as any;
      csSchemaData = d;
      return grade("T15a.1", "cs schema", "PASS",
        `row_count=${d.row_count}, data_type=${d.data_type}, columns=${d.columns?.length}`,
        d);
    },
  );

  if (csSchemaData) {
    const csNumeric = csSchemaData.columns?.filter((c: any) => c.kind === "numeric")?.map((c: any) => c.name) ?? [];
    const csSelect = csNumeric.slice(0, 5);
    console.log(`  CS numeric cols (${csNumeric.length}): [${csNumeric.slice(0, 8).join(", ")}${csNumeric.length > 8 ? "..." : ""}]`);

    await run(
      "T15a.2",
      "Credible set: top rows",
      () => api(`/cohorts/${CREDIBLE_SET_ID}/rows`, {
        method: "POST",
        body: { limit: 5, select: csSelect },
      }),
      (resp) => {
        if (!resp.ok) return grade("T15a.2", "cs rows", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T15a.2", "cs rows", d.rows?.length ? "PASS" : "PARTIAL",
          `${d.rows?.length ?? 0} rows, total=${d.total}`,
          d);
      },
    );

    // PCA on credible_set
    if (csNumeric.length >= 3) {
      const csPcaCols = csNumeric.filter((c: string) => !INTERNAL_COLS.has(c)).slice(0, 5);
      await run(
        "T15a.3",
        `Credible set PCA: ${csPcaCols.slice(0, 3).join(",")}...`,
        async () => {
          const submit = await api(analyticsUrl(CREDIBLE_SET_ID), {
            method: "POST",
            body: { task: { type: "pca", features: { numeric: csPcaCols }, n_components: 2 } },
          });
          if (!submit.ok) return submit;
          const runId = (submit.data as any).run_id;
          if (!runId) return submit;
          return pollAnalytics(CREDIBLE_SET_ID, runId);
        },
        (resp) => {
          if (!resp.ok) return grade("T15a.3", "cs PCA", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T15a.3", "cs PCA", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          const r = d.result ?? d;
          return grade("T15a.3", "cs PCA", "PASS",
            `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}]`,
            d);
        },
      );
    }
  }

  // --- 15b: fine_mapping schema + rows ---
  let fmSchemaData: any = null;
  await run(
    "T15b.1",
    "Fine mapping: schema",
    () => api(`/cohorts/${FINE_MAPPING_ID}/schema`),
    (resp) => {
      if (!resp.ok) return grade("T15b.1", "fm schema", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
      const d = resp.data as any;
      fmSchemaData = d;
      return grade("T15b.1", "fm schema", "PASS",
        `row_count=${d.row_count}, data_type=${d.data_type}, columns=${d.columns?.length}`,
        d);
    },
  );

  if (fmSchemaData) {
    const fmNumeric = fmSchemaData.columns?.filter((c: any) => c.kind === "numeric")?.map((c: any) => c.name) ?? [];
    const fmSelect = fmNumeric.slice(0, 5);
    console.log(`  FM numeric cols (${fmNumeric.length}): [${fmNumeric.slice(0, 8).join(", ")}${fmNumeric.length > 8 ? "..." : ""}]`);

    await run(
      "T15b.2",
      "Fine mapping: top rows",
      () => api(`/cohorts/${FINE_MAPPING_ID}/rows`, {
        method: "POST",
        body: { limit: 5, select: fmSelect },
      }),
      (resp) => {
        if (!resp.ok) return grade("T15b.2", "fm rows", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T15b.2", "fm rows", d.rows?.length ? "PASS" : "PARTIAL",
          `${d.rows?.length ?? 0} rows, total=${d.total}`,
          d);
      },
    );

    // Regression on fine_mapping
    if (fmNumeric.length >= 3) {
      const fmCols = fmNumeric.filter((c: string) => !INTERNAL_COLS.has(c)).slice(0, 5);
      if (fmCols.length >= 2) {
        await run(
          "T15b.3",
          `Fine mapping regression: target=${fmCols[0]}`,
          async () => {
            const submit = await api(analyticsUrl(FINE_MAPPING_ID), {
              method: "POST",
              body: {
                task: {
                  type: "linear_regression",
                  target: { field: fmCols[0] },
                  features: { numeric: fmCols.slice(1, 4) },
                },
              },
            });
            if (!submit.ok) return submit;
            const runId = (submit.data as any).run_id;
            if (!runId) return submit;
            return pollAnalytics(FINE_MAPPING_ID, runId);
          },
          (resp) => {
            if (!resp.ok) return grade("T15b.3", "fm regression", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
            const d = resp.data as any;
            if (d.status === "failed") return grade("T15b.3", "fm regression", "FAIL", `Failed: ${d.error_message ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
            const r = d.result ?? d;
            return grade("T15b.3", "fm regression", "PASS",
              `status=${d.status}, metrics=[${r.metrics ? Object.keys(r.metrics).join(",") : "none"}]`,
              d);
          },
        );
      }
    }
  }

  // ====================================================================
  // GROUP 16: createCohort (variant_list) + schema
  // ====================================================================
  console.log("\n─── GROUP 16: createCohort (variant_list) ───");

  let variantCohortId: string | null = null;

  const createResult = await run(
    "T16.1",
    "Create variant_list cohort from 20 rsIDs",
    () => api("/cohorts", {
      method: "POST",
      body: {
        references: TEST_VARIANTS,
        label: "stress-test-cohort-tools",
        idempotency_key: `stress-test-${Date.now()}`,
      },
      timeout: 60_000,
    }),
    (resp) => {
      if (!resp.ok) return grade("T16.1", "create cohort", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T16.1", "create cohort", d.id ? "PASS" : "FAIL",
        `id=${d.id}, status=${d.status}`,
        d);
    },
  );

  if (createResult && (createResult as any).ok) {
    const createData = (createResult as any).data as any;
    variantCohortId = createData.id;

    // Poll until ready
    if (variantCohortId) {
      await run(
        "T16.2",
        "Poll cohort status until ready",
        async () => {
          const deadline = Date.now() + 120_000;
          while (Date.now() < deadline) {
            const resp = await api(`/cohorts/${variantCohortId}/status`);
            if (!resp.ok) return resp;
            const d = resp.data as any;
            if (d.is_terminal) return resp;
            await new Promise((r) => setTimeout(r, d.poll_hint_ms ?? 2000));
          }
          return { status: 408, ok: false, data: { error: "timeout" }, raw: "timeout" };
        },
        (resp) => {
          if (!resp.ok) return grade("T16.2", "poll status", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
          const d = resp.data as any;
          return grade("T16.2", "poll status", d.status === "ready" ? "PASS" : "FAIL",
            `status=${d.status}, progress=${JSON.stringify(d.progress)}`,
            d);
        },
      );

      // Schema for variant_list cohort — also discover available_methods
      let variantSchemaData: any = null;
      await run(
        "T16.3",
        "Schema for variant_list cohort",
        () => api(`/cohorts/${variantCohortId}/schema`),
        (resp) => {
          if (!resp.ok) return grade("T16.3", "variant schema", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
          const d = resp.data as any;
          variantSchemaData = d;
          return grade("T16.3", "variant schema", "PASS",
            `row_count=${d.row_count}, data_type=${d.data_type}, columns=${d.columns?.length}, available_methods=${d.available_methods?.length ?? 0}`,
            d);
        },
      );

      // PCA on variant_list cohort — use schema columns or available_methods auto_config
      const vlPcaAutoConfig = variantSchemaData?.available_methods?.find((m: any) => m.method === "pca")?.auto_config;
      const vlPcaFeatures = vlPcaAutoConfig?.features?.numeric ?? vlPcaAutoConfig?.features ??
        variantSchemaData?.columns?.filter((c: any) => c.kind === "numeric")?.map((c: any) => c.name)?.slice(0, 5) ??
        ["cadd_phred", "revel", "gnomad_af", "fathmm_xf", "apc_conservation"];
      console.log(`    variant PCA features: [${vlPcaFeatures.join(", ")}] (source: ${vlPcaAutoConfig ? "auto_config" : "schema/fallback"})`);

      await run(
        "T16.4",
        `PCA on variant_list cohort (${vlPcaFeatures.slice(0, 3).join(", ")}...)`,
        async () => {
          const submit = await api(analyticsUrl(variantCohortId!), {
            method: "POST",
            body: {
              task: {
                type: "pca",
                features: { numeric: vlPcaFeatures },
                n_components: 2,
              },
            },
          });
          if (!submit.ok) return submit;
          const runId = (submit.data as any).run_id;
          if (!runId) return submit;
          return pollAnalytics(variantCohortId!, runId);
        },
        (resp) => {
          if (!resp.ok) return grade("T16.4", "variant PCA", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T16.4", "variant PCA", "FAIL", `Failed: ${d.error_message ?? d.error ?? "unknown"} (code: ${d.error_code ?? "none"})`, d);
          return grade("T16.4", "variant PCA", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], charts=${d.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 17: Error handling
  // ====================================================================
  console.log("\n─── GROUP 17: Error handling ───");

  // Non-existent cohort
  await run(
    "T17.1",
    "Schema: nonexistent cohort",
    () => api("/cohorts/nonexistent-abc-123/schema"),
    (resp) => {
      if (resp.status === 404 || resp.status === 400) return grade("T17.1", "bad id", "PASS", `Correct ${resp.status}: ${resp.raw.slice(0, 100)}`);
      if (!resp.ok) return grade("T17.1", "bad id", "PARTIAL", `Got ${resp.status} instead of 400/404: ${resp.raw.slice(0, 100)}`);
      return grade("T17.1", "bad id", "FAIL", "Expected error but got success");
    },
  );

  // Invalid analytics task
  await run(
    "T17.2",
    "Analytics: invalid task type",
    () => api(analyticsUrl(GWAS_COHORT_ID), {
      method: "POST",
      body: { task: { type: "invalid_type" } },
    }),
    (resp) => {
      if (resp.status >= 400 && resp.status < 500) return grade("T17.2", "bad task", "PASS", `Correct ${resp.status}: ${resp.raw.slice(0, 200)}`);
      return grade("T17.2", "bad task", "FAIL", `Unexpected ${resp.status}: ${resp.raw.slice(0, 200)}`);
    },
  );

  // PCA with bad columns
  await run(
    "T17.3",
    "Analytics: PCA with invalid columns",
    () => api(analyticsUrl(GWAS_COHORT_ID), {
      method: "POST",
      body: { task: { type: "pca", features: { numeric: ["nonexistent_col_1", "nonexistent_col_2"] } } },
    }),
    (resp) => {
      // Could be immediate 400 or async failure
      if (resp.status >= 400 && resp.status < 500) return grade("T17.3", "bad cols", "PASS", `Immediate error ${resp.status}: ${resp.raw.slice(0, 200)}`);
      if (resp.ok) {
        const d = resp.data as any;
        if (d.run_id) return grade("T17.3", "bad cols", "PARTIAL", `Accepted (async validation) — run_id=${d.run_id}. Will fail during polling.`);
      }
      return grade("T17.3", "bad cols", "PARTIAL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
    },
  );

  // ====================================================================
  // SCORE CARD
  // ====================================================================
  console.log(`\n\n${"═".repeat(70)}`);
  console.log("  SCORE CARD");
  console.log("═".repeat(70));
  console.log("Test   | Grade   | Time  | Name");
  console.log("─".repeat(70));
  for (const r of results) {
    const emoji = r.grade === "PASS" ? "✅" : r.grade === "PARTIAL" ? "⚠️" : "❌";
    console.log(
      `${r.id.padEnd(8)} | ${emoji} ${r.grade.padEnd(7)} | ${r.elapsed.toFixed(1).padStart(5)}s | ${r.name}`,
    );
  }
  console.log("─".repeat(70));
  const pass = results.filter((r) => r.grade === "PASS").length;
  const partialCount = results.filter((r) => r.grade === "PARTIAL").length;
  const failCount = results.filter((r) => r.grade === "FAIL").length;
  console.log(`Total: ${pass} PASS, ${partialCount} PARTIAL, ${failCount} FAIL out of ${results.length}`);

  // Failure details
  const failures = results.filter((r) => r.grade !== "PASS");
  if (failures.length > 0) {
    console.log("\n\nFAILURE/PARTIAL DETAILS:");
    for (const f of failures) {
      console.log(`\n  ${f.id}: ${f.name}`);
      console.log(`    Grade: ${f.grade}`);
      console.log(`    Notes: ${f.notes}`);
      if (f.responseKeys) console.log(`    Response keys: [${f.responseKeys.join(", ")}]`);
      if (f.rawSnippet) console.log(`    Raw: ${f.rawSnippet.slice(0, 300)}`);
    }
  }

  // Save full results
  writeFileSync(
    "scripts/stress-test-cohort-tools-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\n\nFull results → scripts/stress-test-cohort-tools-results.json");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
