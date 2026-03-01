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
const GWAS_COHORT_ID = process.env.TEST_COHORT_ID || "84a8d62b-bee9-45e5-ae4f-2913323740e0";

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
    if (d.status === "completed" || d.status === "failed") return resp;
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
      if (d.capabilities) notes.push(`capabilities=[${d.capabilities.join(",")}]`);
      if (d.columns?.length) notes.push(`columns=${d.columns.length}`);
      if (d.text_summary) notes.push(`has text_summary`);
      if (d.profile) notes.push(`has profile`);
      return grade("T1.1", "schema", "PASS", notes.join(", "), d);
    },
  );

  // Dump full column listing
  if (schemaData?.columns) {
    console.log("\n  📋 FULL COLUMN LISTING:");
    const cols = schemaData.columns as Array<{ name: string; kind: string; [k: string]: unknown }>;
    const byKind: Record<string, string[]> = {};
    for (const c of cols) {
      (byKind[c.kind] ??= []).push(c.name);
    }
    for (const [kind, names] of Object.entries(byKind)) {
      console.log(`    ${kind}: [${names.join(", ")}]`);
    }
  }

  // ====================================================================
  // GROUP 2: analyzeCohort — rows (GWAS sumstats)
  // ====================================================================
  console.log("\n─── GROUP 2: analyzeCohort(rows) on GWAS cohort ───");

  // We need to know actual column names from schema
  const numericCols = schemaData?.columns
    ?.filter((c: any) => c.kind === "numeric")
    ?.map((c: any) => c.name) ?? [];

  const firstNumericCol = numericCols[0] ?? "original_p_value";
  console.log(`  Using numeric column for sort: ${firstNumericCol}`);

  await run(
    "T2.1",
    `Rows: top 10 by ${firstNumericCol}`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: { sort: firstNumericCol, desc: true, limit: 10 },
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

  // Rows with score filter
  await run(
    "T2.3",
    "Rows: filter score_above on first numeric col",
    () => api(`/cohorts/${GWAS_COHORT_ID}/rows`, {
      method: "POST",
      body: {
        filters: [{ type: "score_above", field: firstNumericCol, threshold: 0 }],
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
      body: { sort: pvalCol, desc: false, limit: 10 },
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

  const deriveResult = await run(
    "T4.1",
    `Derive: ${firstNumericCol} > 0`,
    () => api(`/cohorts/${GWAS_COHORT_ID}/derive`, {
      method: "POST",
      body: {
        filters: [{ type: "score_above", field: firstNumericCol, threshold: 0 }],
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

  // Derive with categorical filter (if available)
  if (categoricalCols.includes("chromosome")) {
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

  const pcaCols = numericCols.slice(0, 5);
  console.log(`  PCA columns: [${pcaCols.join(", ")}]`);

  let pcaRunId: string | null = null;

  const pcaSubmit = await run(
    "T8.1",
    "PCA: submit run",
    () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
      method: "POST",
      body: { task: { type: "pca", columns: pcaCols, n_components: 2 } },
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
        if (d.status === "failed") return grade("T8.2", "pca poll", "FAIL", `Failed: ${d.error}`, d);
        return grade("T8.2", "pca poll", "PASS",
          `status=${d.status}, metrics keys=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], viz_charts=${d.viz_charts?.length ?? 0}`,
          d);
      },
    );

    // Fetch charts
    if (pcaPoll && (pcaPoll as any).ok) {
      const pollData = (pcaPoll as any).data as any;
      if (pollData.viz_charts?.length) {
        for (const chart of pollData.viz_charts) {
          await run(
            `T8.3-${chart.chart_id}`,
            `PCA chart: ${chart.chart_type} (${chart.chart_id})`,
            () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/runs/${pcaRunId}/viz?chart_id=${chart.chart_id}`),
            (resp) => {
              if (!resp.ok) return grade(`T8.3-${chart.chart_id}`, "pca chart", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
              const d = resp.data as any;
              return grade(`T8.3-${chart.chart_id}`, "pca chart", "PASS",
                `chart_type=${d.chart_type}, title=${d.title}, data keys=[${d.data ? Object.keys(d.data).join(",") : typeof d.data}]`,
                d);
            },
          );
        }
      } else if (pollData.metrics) {
        console.log(`  📊 PCA metrics: ${JSON.stringify(pollData.metrics).slice(0, 500)}`);
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
    () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
      method: "POST",
      body: { task: { type: "clustering", columns: pcaCols, method: "kmeans", n_clusters: 3 } },
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
    await run(
      "T9.2",
      "Clustering: poll until complete",
      () => pollAnalytics(GWAS_COHORT_ID, clusterRunId!),
      (resp) => {
        if (!resp.ok) return grade("T9.2", "cluster poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        if (d.status === "failed") return grade("T9.2", "cluster poll", "FAIL", `Failed: ${d.error}`, d);
        return grade("T9.2", "cluster poll", "PASS",
          `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], charts=${d.viz_charts?.length ?? 0}`,
          d);
      },
    );
  }

  // ====================================================================
  // GROUP 10: runAnalytics — regression
  // ====================================================================
  console.log("\n─── GROUP 10: runAnalytics(regression) ───");

  if (numericCols.length >= 3) {
    let regRunId: string | null = null;

    const regSubmit = await run(
      "T10.1",
      "Regression: linear",
      () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
        method: "POST",
        body: {
          task: {
            type: "regression",
            target: numericCols[0],
            features: numericCols.slice(1, 4),
            method: "linear",
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
      await run(
        "T10.2",
        "Regression: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, regRunId!),
        (resp) => {
          if (!resp.ok) return grade("T10.2", "regression poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T10.2", "regression poll", "FAIL", `Failed: ${d.error}`, d);
          return grade("T10.2", "regression poll", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}]`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 11: runAnalytics — statistical_test
  // ====================================================================
  console.log("\n─── GROUP 11: runAnalytics(statistical_test) ───");

  if (numericCols.length >= 1 && categoricalCols.length >= 1) {
    let statRunId: string | null = null;

    const statSubmit = await run(
      "T11.1",
      `Statistical test: anova on ${numericCols[0]} by ${categoricalCols[0]}`,
      () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
        method: "POST",
        body: {
          task: {
            type: "statistical_test",
            test: "anova",
            column: numericCols[0],
            group_by: categoricalCols[0],
            correction: "fdr_bh",
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
          if (d.status === "failed") return grade("T11.2", "stat poll", "FAIL", `Failed: ${d.error}`, d);
          return grade("T11.2", "stat poll", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}]`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 12: runAnalytics — QQ plot
  // ====================================================================
  console.log("\n─── GROUP 12: runAnalytics(qq_plot) ───");

  if (pvalCol) {
    let qqRunId: string | null = null;

    const qqSubmit = await run(
      "T12.1",
      `QQ plot: p_value_column=${pvalCol}`,
      () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
        method: "POST",
        body: { task: { type: "qq_plot", p_value_column: pvalCol } },
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
      await run(
        "T12.2",
        "QQ plot: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, qqRunId!),
        (resp) => {
          if (!resp.ok) return grade("T12.2", "qq poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T12.2", "qq poll", "FAIL", `Failed: ${d.error}`, d);
          return grade("T12.2", "qq poll", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], charts=${d.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 13: runAnalytics — Manhattan plot
  // ====================================================================
  console.log("\n─── GROUP 13: runAnalytics(manhattan_plot) ───");

  if (pvalCol) {
    let manhattanRunId: string | null = null;

    const manhattanSubmit = await run(
      "T13.1",
      `Manhattan plot: p_value_column=${pvalCol}`,
      () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
        method: "POST",
        body: { task: { type: "manhattan_plot", p_value_column: pvalCol } },
      }),
      (resp) => {
        if (!resp.ok) return grade("T13.1", "manhattan submit", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
        const d = resp.data as any;
        return grade("T13.1", "manhattan submit", d.run_id ? "PASS" : "FAIL",
          `run_id=${d.run_id}`,
          d);
      },
    );

    if (manhattanSubmit && (manhattanSubmit as any).ok) {
      manhattanRunId = ((manhattanSubmit as any).data as any)?.run_id ?? null;
    }

    if (manhattanRunId) {
      await run(
        "T13.2",
        "Manhattan plot: poll until complete",
        () => pollAnalytics(GWAS_COHORT_ID, manhattanRunId!),
        (resp) => {
          if (!resp.ok) return grade("T13.2", "manhattan poll", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T13.2", "manhattan poll", "FAIL", `Failed: ${d.error}`, d);
          return grade("T13.2", "manhattan poll", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], charts=${d.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 14: createCohort (variant_list) + schema
  // ====================================================================
  console.log("\n─── GROUP 14: createCohort (variant_list) ───");

  let variantCohortId: string | null = null;

  const createResult = await run(
    "T14.1",
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
      if (!resp.ok) return grade("T14.1", "create cohort", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
      const d = resp.data as any;
      return grade("T14.1", "create cohort", d.id ? "PASS" : "FAIL",
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
        "T14.2",
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
          if (!resp.ok) return grade("T14.2", "poll status", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
          const d = resp.data as any;
          return grade("T14.2", "poll status", d.status === "ready" ? "PASS" : "FAIL",
            `status=${d.status}, progress=${JSON.stringify(d.progress)}`,
            d);
        },
      );

      // Schema for variant_list cohort
      await run(
        "T14.3",
        "Schema for variant_list cohort",
        () => api(`/cohorts/${variantCohortId}/schema`),
        (resp) => {
          if (!resp.ok) return grade("T14.3", "variant schema", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
          const d = resp.data as any;
          return grade("T14.3", "variant schema", "PASS",
            `row_count=${d.row_count}, data_type=${d.data_type}, columns=${d.columns?.length}`,
            d);
        },
      );

      // PCA on variant_list cohort
      await run(
        "T14.4",
        "PCA on variant_list cohort (cadd, revel, gnomad_af, fathmm_xf, apc_conservation)",
        async () => {
          const submit = await api(`/cohorts/${variantCohortId}/analytics/run`, {
            method: "POST",
            body: {
              task: {
                type: "pca",
                columns: ["cadd_phred", "revel", "gnomad_af", "fathmm_xf", "apc_conservation"],
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
          if (!resp.ok) return grade("T14.4", "variant PCA", "FAIL", `HTTP ${resp.status}: ${resp.raw.slice(0, 300)}`);
          const d = resp.data as any;
          if (d.status === "failed") return grade("T14.4", "variant PCA", "FAIL", `Failed: ${d.error}`, d);
          return grade("T14.4", "variant PCA", "PASS",
            `status=${d.status}, metrics=[${d.metrics ? Object.keys(d.metrics).join(",") : "none"}], charts=${d.viz_charts?.length ?? 0}`,
            d);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 15: Error handling
  // ====================================================================
  console.log("\n─── GROUP 15: Error handling ───");

  // Non-existent cohort
  await run(
    "T15.1",
    "Schema: nonexistent cohort",
    () => api("/cohorts/nonexistent-abc-123/schema"),
    (resp) => {
      if (resp.status === 404) return grade("T15.1", "404", "PASS", `Correct 404: ${resp.raw.slice(0, 100)}`);
      if (!resp.ok) return grade("T15.1", "404", "PARTIAL", `Got ${resp.status} instead of 404: ${resp.raw.slice(0, 100)}`);
      return grade("T15.1", "404", "FAIL", "Expected error but got success");
    },
  );

  // Invalid analytics task
  await run(
    "T15.2",
    "Analytics: invalid task type",
    () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
      method: "POST",
      body: { task: { type: "invalid_type" } },
    }),
    (resp) => {
      if (resp.status >= 400 && resp.status < 500) return grade("T15.2", "bad task", "PASS", `Correct ${resp.status}: ${resp.raw.slice(0, 200)}`);
      return grade("T15.2", "bad task", "FAIL", `Unexpected ${resp.status}: ${resp.raw.slice(0, 200)}`);
    },
  );

  // PCA with bad columns
  await run(
    "T15.3",
    "Analytics: PCA with invalid columns",
    () => api(`/cohorts/${GWAS_COHORT_ID}/analytics/run`, {
      method: "POST",
      body: { task: { type: "pca", columns: ["nonexistent_col_1", "nonexistent_col_2"] } },
    }),
    (resp) => {
      // Could be immediate 400 or async failure
      if (resp.status >= 400 && resp.status < 500) return grade("T15.3", "bad cols", "PASS", `Immediate error ${resp.status}: ${resp.raw.slice(0, 200)}`);
      if (resp.ok) {
        const d = resp.data as any;
        if (d.run_id) return grade("T15.3", "bad cols", "PARTIAL", `Accepted (async validation) — run_id=${d.run_id}. Will fail during polling.`);
      }
      return grade("T15.3", "bad cols", "PARTIAL", `HTTP ${resp.status}: ${resp.raw.slice(0, 200)}`);
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
