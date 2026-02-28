/**
 * No-LLM stress test for VariantTriage tools.
 * Calls each tool's execute() directly — validates APIs, response shapes,
 * chaining, error handling, and edge cases.
 *
 * Usage: npx tsx scripts/stress-test-variant-tools.ts
 */

import { createCohort } from "../src/features/agent/tools/cohort-create";
import { getCohortSchema } from "../src/features/agent/tools/cohort-schema";
import { analyzeCohort } from "../src/features/agent/tools/cohort-analyze";
import { lookupVariant } from "../src/features/agent/tools/lookup-variant";
import { getGeneVariantStats } from "../src/features/agent/tools/gene-variant-stats";
import { getGwasAssociations } from "../src/features/agent/tools/gwas-lookup";
import { variantBatchSummary } from "../src/features/agent/tools/variant-batch-summary";
import { writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOOL_OPTS = (id: string) =>
  ({ toolCallId: id, messages: [], abortSignal: AbortSignal.timeout(120_000) }) as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ai SDK types .execute as possibly undefined
function exec(tool: any, input: any, id: string): Promise<any> {
  return tool.execute(input, TOOL_OPTS(id));
}

type Grade = "PASS" | "PARTIAL" | "FAIL";

interface TestResult {
  id: string;
  name: string;
  grade: Grade;
  elapsed: number;
  notes: string;
  output?: unknown;
}

const results: TestResult[] = [];

function ok(test: string, name: string, output: unknown, notes = "all checks passed"): TestResult {
  return { id: test, name, grade: "PASS", elapsed: 0, notes, output };
}

function partial(test: string, name: string, output: unknown, notes: string): TestResult {
  return { id: test, name, grade: "PARTIAL", elapsed: 0, notes, output };
}

function fail(test: string, name: string, output: unknown, notes: string): TestResult {
  return { id: test, name, grade: "FAIL", elapsed: 0, notes, output };
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

function isErr(out: unknown): boolean {
  return !!out && typeof out === "object" && "error" in out && (out as any).error === true;
}

// ---------------------------------------------------------------------------
// Test variants (well-known GWAS hits)
// ---------------------------------------------------------------------------

const TEST_VARIANTS = [
  "rs429358",     // APOE ε4 — Alzheimer's
  "rs7412",       // APOE ε2 — Alzheimer's protective
  "rs75932628",   // TREM2 — Alzheimer's
  "rs63750847",   // APP — Alzheimer's
  "rs143332484",  // PSEN1 — Alzheimer's
  "rs11571833",   // BRCA2 — breast cancer
  "rs80357906",   // BRCA2 — breast cancer
  "rs28897696",   // BRCA1 — breast cancer
  "rs121913529",  // KRAS — cancer
  "rs121912651",  // TP53 — cancer
  "rs1801133",    // MTHFR — folate metabolism
  "rs334",        // HBB — sickle cell
  "rs1800497",    // DRD2/ANKK1 — dopamine
  "rs4680",       // COMT — dopamine/pain
  "rs1799945",    // HFE — hemochromatosis
  "rs1800562",    // HFE — hemochromatosis
  "rs7903146",    // TCF7L2 — type 2 diabetes
  "rs5219",       // KCNJ11 — type 2 diabetes
  "rs12255372",   // TCF7L2 — type 2 diabetes
  "rs1801282",    // PPARG — type 2 diabetes
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("═".repeat(70));
  console.log("  VariantTriage Tools — No-LLM API Stress Test");
  console.log("═".repeat(70));

  // ── Verify API is up ────────────────────────────────────────────────
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${apiBase}/variants/rs429358?depth=minimal`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    console.log("✅ API accessible\n");
  } catch {
    console.error("❌ API not accessible at localhost:8000");
    process.exit(1);
  }

  // ====================================================================
  // GROUP 1: createCohort
  // ====================================================================
  console.log("\n─── GROUP 1: createCohort ───");

  let cohortId: string | null = null;

  const cohortResult = await run(
    "T1.1",
    "Create cohort from 20 GWAS variants",
    () => exec(createCohort, { variants: TEST_VARIANTS, label: "stress-test" }, "t1.1"),
    (out: any) => {
      if (isErr(out)) return fail("T1.1", "createCohort", out, `API error: ${out.message}`);
      if (!out.cohortId) return fail("T1.1", "createCohort", out, "Missing cohortId");
      if (!out.variantCount) return fail("T1.1", "createCohort", out, "Missing variantCount");
      if (!out.resolution) return partial("T1.1", "createCohort", out, "Missing resolution breakdown");
      const res = out.resolution;
      return ok("T1.1", "createCohort", out,
        `cohortId=${out.cohortId}, variants=${out.variantCount}, resolved=${res.resolved}/${res.total}, notFound=${res.notFound}`);
    },
  );

  if (cohortResult && !isErr(cohortResult)) {
    cohortId = (cohortResult as any).cohortId;
  }

  if (!cohortId) {
    console.error("\n❌ Cannot continue without a cohortId. Aborting cohort tests.\n");
  }

  // ====================================================================
  // GROUP 2: getCohortSchema
  // ====================================================================
  console.log("\n─── GROUP 2: getCohortSchema ───");

  let schemaColumns: string[] = [];

  if (cohortId) {
    await run(
      "T2.1",
      "Get schema for test cohort",
      () => exec(getCohortSchema, { cohortId: cohortId! }, "t2.1"),
      (out: any) => {
        if (isErr(out)) return fail("T2.1", "getCohortSchema", out, `API error: ${out.message}`);
        if (!out.columns) return fail("T2.1", "getCohortSchema", out, "Missing columns");
        if (!out.columns.score?.length) return fail("T2.1", "getCohortSchema", out, "No score columns");
        if (!out.columns.categorical?.length) return fail("T2.1", "getCohortSchema", out, "No categorical columns");
        schemaColumns = out.columns.score;
        const expectedCategorical = ["chromosome", "gene", "consequence", "clinical_significance"];
        const hasCategorical = expectedCategorical.every((c: string) => out.columns.categorical.includes(c));
        if (!hasCategorical) return partial("T2.1", "getCohortSchema", out, `Missing categorical columns — got: ${out.columns.categorical.join(",")}`);
        return ok("T2.1", "getCohortSchema", out,
          `rowCount=${out.rowCount}, scoreColumns=${out.columns.score.length}, categoricalColumns=${out.columns.categorical.length}`);
      },
    );

    // Schema for non-existent cohort
    await run(
      "T2.2",
      "Schema for non-existent cohort (error handling)",
      () => exec(getCohortSchema, { cohortId: "nonexistent-id-12345" }, "t2.2"),
      (out: any) => {
        if (isErr(out)) return ok("T2.2", "getCohortSchema error", out, `Correct error: ${out.message?.slice(0, 80)}`);
        return fail("T2.2", "getCohortSchema error", out, "Expected error for nonexistent cohort but got success");
      },
    );
  }

  // ====================================================================
  // GROUP 3: analyzeCohort — rows
  // ====================================================================
  console.log("\n─── GROUP 3: analyzeCohort(rows) ───");

  if (cohortId) {
    // Basic rows
    await run(
      "T3.1",
      "Rows: top 10 by cadd_phred",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "rows", sort: "cadd_phred", desc: true, limit: 10 }, "t3.1"),
      (out: any) => {
        if (isErr(out)) return fail("T3.1", "rows", out, `API error: ${out.message}`);
        if (!Array.isArray(out.rows)) return fail("T3.1", "rows", out, "Missing rows array");
        if (out.rows.length === 0) return partial("T3.1", "rows", out, "Empty rows — cohort may have no CADD scores");
        if (out.rows.length > 10) return partial("T3.1", "rows", out, `Got ${out.rows.length} rows, expected ≤10`);
        // Check sort order
        const scores = out.rows.map((r: any) => r.cadd_phred).filter((v: any) => v != null);
        const sorted = [...scores].sort((a: number, b: number) => b - a);
        const isSorted = JSON.stringify(scores) === JSON.stringify(sorted);
        if (!isSorted) return partial("T3.1", "rows", out, "Rows not sorted descending by cadd_phred");
        return ok("T3.1", "rows", out, `${out.rows.length} rows, top CADD=${scores[0]}, total=${out.total}`);
      },
    );

    // Rows with select
    await run(
      "T3.2",
      "Rows: custom select columns",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "rows", select: ["variant_vcf", "gene", "cadd_phred", "revel", "gnomad_af"], limit: 5 }, "t3.2"),
      (out: any) => {
        if (isErr(out)) return fail("T3.2", "rows+select", out, `API error: ${out.message}`);
        if (!out.rows?.length) return partial("T3.2", "rows+select", out, "No rows returned");
        const row = out.rows[0];
        const hasExpected = "variant_vcf" in row || "gene" in row;
        if (!hasExpected) return partial("T3.2", "rows+select", out, `Row keys: ${Object.keys(row).join(",")}`);
        return ok("T3.2", "rows+select", out, `${out.rows.length} rows, columns: ${Object.keys(row).join(",")}`);
      },
    );

    // Rows with filter
    await run(
      "T3.3",
      "Rows: filter by gene",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "rows", filters: [{ type: "gene" as const, values: ["APOE", "BRCA1", "BRCA2"] }], limit: 50 }, "t3.3"),
      (out: any) => {
        if (isErr(out)) return fail("T3.3", "rows+filter", out, `API error: ${out.message}`);
        if (!Array.isArray(out.rows)) return fail("T3.3", "rows+filter", out, "Missing rows array");
        // Check all rows are in filtered genes
        const wrongGene = out.rows.find((r: any) => r.gene && !["APOE", "BRCA1", "BRCA2"].includes(r.gene));
        if (wrongGene) return partial("T3.3", "rows+filter", out, `Got unexpected gene: ${wrongGene.gene}`);
        return ok("T3.3", "rows+filter", out, `${out.rows.length} rows after gene filter, total=${out.total}`);
      },
    );

    // Rows with score_above filter
    await run(
      "T3.4",
      "Rows: filter cadd_phred > 20",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "rows", filters: [{ type: "score_above" as const, field: "cadd_phred" as any, threshold: 20 }], sort: "cadd_phred", desc: true }, "t3.4"),
      (out: any) => {
        if (isErr(out)) return fail("T3.4", "rows+score_above", out, `API error: ${out.message}`);
        if (!Array.isArray(out.rows)) return fail("T3.4", "rows+score_above", out, "Missing rows array");
        const belowThreshold = out.rows.find((r: any) => r.cadd_phred != null && r.cadd_phred < 20);
        if (belowThreshold) return partial("T3.4", "rows+score_above", out, `Found CADD=${belowThreshold.cadd_phred} below threshold`);
        return ok("T3.4", "rows+score_above", out, `${out.rows.length} rows with CADD>20, total=${out.total}`);
      },
    );
  }

  // ====================================================================
  // GROUP 4: analyzeCohort — groupby
  // ====================================================================
  console.log("\n─── GROUP 4: analyzeCohort(groupby) ───");

  if (cohortId) {
    // Groupby gene
    await run(
      "T4.1",
      "Groupby: gene",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "groupby", group_by: "gene" }, "t4.1"),
      (out: any) => {
        if (isErr(out)) return fail("T4.1", "groupby gene", out, `API error: ${out.message}`);
        if (!Array.isArray(out.buckets)) return fail("T4.1", "groupby gene", out, "Missing buckets array");
        if (out.buckets.length === 0) return partial("T4.1", "groupby gene", out, "Empty buckets");
        const first = out.buckets[0];
        const hasCount = "count" in first || "variant_count" in first;
        if (!hasCount) return partial("T4.1", "groupby gene", out, `Bucket keys: ${Object.keys(first).join(",")}`);
        return ok("T4.1", "groupby gene", out,
          `${out.buckets.length} gene groups, total_groups=${out.total_groups}`);
      },
    );

    // Groupby consequence
    await run(
      "T4.2",
      "Groupby: consequence",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "groupby", group_by: "consequence" }, "t4.2"),
      (out: any) => {
        if (isErr(out)) return fail("T4.2", "groupby consequence", out, `API error: ${out.message}`);
        if (!Array.isArray(out.buckets)) return fail("T4.2", "groupby consequence", out, "Missing buckets");
        return ok("T4.2", "groupby consequence", out, `${out.buckets.length} consequence types`);
      },
    );

    // Groupby clinical_significance
    await run(
      "T4.3",
      "Groupby: clinical_significance",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "groupby", group_by: "clinical_significance" }, "t4.3"),
      (out: any) => {
        if (isErr(out)) return fail("T4.3", "groupby clin_sig", out, `API error: ${out.message}`);
        if (!Array.isArray(out.buckets)) return fail("T4.3", "groupby clin_sig", out, "Missing buckets");
        return ok("T4.3", "groupby clin_sig", out, `${out.buckets.length} significance categories`);
      },
    );

    // Groupby with metrics
    await run(
      "T4.4",
      "Groupby: gene with cadd_phred metrics",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "groupby", group_by: "gene", metrics: ["cadd_phred", "revel"] }, "t4.4"),
      (out: any) => {
        if (isErr(out)) return fail("T4.4", "groupby+metrics", out, `API error: ${out.message}`);
        if (!Array.isArray(out.buckets) || !out.buckets.length) return partial("T4.4", "groupby+metrics", out, "Empty buckets");
        const first = out.buckets[0];
        const keys = Object.keys(first);
        const hasMetric = keys.some((k) => k.includes("cadd") || k.includes("mean") || k.includes("max") || k.includes("min"));
        if (!hasMetric) return partial("T4.4", "groupby+metrics", out, `No metric columns found — keys: ${keys.join(",")}`);
        return ok("T4.4", "groupby+metrics", out, `${out.buckets.length} groups, bucket keys: ${keys.join(",")}`);
      },
    );

    // Groupby chromosome
    await run(
      "T4.5",
      "Groupby: chromosome",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "groupby", group_by: "chromosome" }, "t4.5"),
      (out: any) => {
        if (isErr(out)) return fail("T4.5", "groupby chromosome", out, `API error: ${out.message}`);
        if (!Array.isArray(out.buckets)) return fail("T4.5", "groupby chromosome", out, "Missing buckets");
        return ok("T4.5", "groupby chromosome", out, `${out.buckets.length} chromosomes`);
      },
    );
  }

  // ====================================================================
  // GROUP 5: analyzeCohort — derive
  // ====================================================================
  console.log("\n─── GROUP 5: analyzeCohort(derive) ───");

  let derivedCohortId: string | null = null;

  if (cohortId) {
    // Derive with clinical significance filter
    const deriveResult = await run(
      "T5.1",
      "Derive: pathogenic + likely_pathogenic",
      () => exec(analyzeCohort, {
        cohortId: cohortId!,
        operation: "derive",
        filters: [{ type: "clinical_significance" as const, values: ["Pathogenic", "Likely_pathogenic"] }],
        label: "pathogenic-only",
      }, "t5.1"),
      (out: any) => {
        if (isErr(out)) return fail("T5.1", "derive clin_sig", out, `API error: ${out.message}`);
        if (!out.derivedCohortId) return fail("T5.1", "derive clin_sig", out, "Missing derivedCohortId");
        return ok("T5.1", "derive clin_sig", out,
          `derivedCohortId=${out.derivedCohortId}, variantCount=${out.variantCount}`);
      },
    );

    if (deriveResult && !isErr(deriveResult)) {
      derivedCohortId = (deriveResult as any).derivedCohortId;
    }

    // Derive with compound filters
    await run(
      "T5.2",
      "Derive: rare + missense + CADD>20",
      () => exec(analyzeCohort, {
        cohortId: cohortId!,
        operation: "derive",
        filters: [
          { type: "score_below" as const, field: "gnomad_af" as any, threshold: 0.01 },
          { type: "consequence" as const, values: ["missense_variant"] },
          { type: "score_above" as const, field: "cadd_phred" as any, threshold: 20 },
        ],
      }, "t5.2"),
      (out: any) => {
        if (isErr(out)) return fail("T5.2", "derive compound", out, `API error: ${out.message}`);
        if (!out.derivedCohortId) return fail("T5.2", "derive compound", out, "Missing derivedCohortId");
        return ok("T5.2", "derive compound", out,
          `derivedCohortId=${out.derivedCohortId}, variantCount=${out.variantCount}`);
      },
    );

    // Derive without filters (expected error)
    await run(
      "T5.3",
      "Derive: no filters (expect validation error)",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "derive" }, "t5.3"),
      (out: any) => {
        if (isErr(out) && out.message?.includes("filter"))
          return ok("T5.3", "derive no-filter error", out, `Correct validation: ${out.message}`);
        if (isErr(out))
          return partial("T5.3", "derive no-filter error", out, `Error but unclear message: ${out.message}`);
        return fail("T5.3", "derive no-filter error", out, "Expected error for derive without filters, got success");
      },
    );

    // Chain: query the derived cohort (small delay to rule out race condition)
    if (derivedCohortId) {
      await new Promise((r) => setTimeout(r, 2000));
      await run(
        "T5.4",
        "Chain: rows on derived cohort (pathogenic only)",
        () => exec(analyzeCohort, { cohortId: derivedCohortId!, operation: "rows", sort: "cadd_phred", desc: true, limit: 10 }, "t5.4"),
        (out: any) => {
          if (isErr(out)) return fail("T5.4", "rows on derived", out, `API error: ${out.message}`);
          if (!Array.isArray(out.rows)) return fail("T5.4", "rows on derived", out, "Missing rows");
          return ok("T5.4", "rows on derived", out, `${out.rows.length} rows from derived cohort, total=${out.total}`);
        },
      );

      await run(
        "T5.5",
        "Chain: groupby gene on derived cohort",
        () => exec(analyzeCohort, { cohortId: derivedCohortId!, operation: "groupby", group_by: "gene" }, "t5.5"),
        (out: any) => {
          if (isErr(out)) return fail("T5.5", "groupby on derived", out, `API error: ${out.message}`);
          if (!Array.isArray(out.buckets)) return fail("T5.5", "groupby on derived", out, "Missing buckets");
          return ok("T5.5", "groupby on derived", out, `${out.buckets.length} gene groups in derived cohort`);
        },
      );
    }
  }

  // ====================================================================
  // GROUP 6: analyzeCohort — prioritize
  // ====================================================================
  console.log("\n─── GROUP 6: analyzeCohort(prioritize) ───");

  if (cohortId) {
    await run(
      "T6.1",
      "Prioritize: CADD + REVEL + conservation",
      () => exec(analyzeCohort, {
        cohortId: cohortId!,
        operation: "prioritize",
        criteria: [
          { column: "cadd_phred", desc: true, weight: 1 },
          { column: "revel", desc: true, weight: 1 },
          { column: "apc_conservation", desc: true, weight: 0.5 },
        ],
        limit: 10,
      }, "t6.1"),
      (out: any) => {
        if (isErr(out)) return fail("T6.1", "prioritize", out, `API error: ${out.message}`);
        if (!Array.isArray(out.rows)) return fail("T6.1", "prioritize", out, "Missing rows");
        if (out.rows.length === 0) return partial("T6.1", "prioritize", out, "Empty results");
        const first = out.rows[0];
        const hasRankScore = "rank_score" in first;
        if (!hasRankScore) return partial("T6.1", "prioritize", out, `No rank_score — keys: ${Object.keys(first).join(",")}`);
        return ok("T6.1", "prioritize", out,
          `${out.rows.length} ranked rows, top rank_score=${first.rank_score}, total_ranked=${out.total_ranked}`);
      },
    );

    // Prioritize without criteria (expected error)
    await run(
      "T6.2",
      "Prioritize: no criteria (expect validation error)",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "prioritize" }, "t6.2"),
      (out: any) => {
        if (isErr(out) && out.message?.includes("criteri"))
          return ok("T6.2", "prioritize no-criteria error", out, `Correct validation: ${out.message}`);
        if (isErr(out))
          return partial("T6.2", "prioritize no-criteria error", out, `Error but unclear: ${out.message}`);
        return fail("T6.2", "prioritize no-criteria error", out, "Expected error, got success");
      },
    );
  }

  // ====================================================================
  // GROUP 7: analyzeCohort — compute
  // ====================================================================
  console.log("\n─── GROUP 7: analyzeCohort(compute) ───");

  if (cohortId) {
    await run(
      "T7.1",
      "Compute: CADD(2) + REVEL(1.5) + AlphaMissense(1), normalized",
      () => exec(analyzeCohort, {
        cohortId: cohortId!,
        operation: "compute",
        weights: [
          { column: "cadd_phred", weight: 2 },
          { column: "revel", weight: 1.5 },
          { column: "alpha_missense", weight: 1 },
        ],
        normalize: true,
        limit: 10,
      }, "t7.1"),
      (out: any) => {
        if (isErr(out)) return fail("T7.1", "compute", out, `API error: ${out.message}`);
        if (!Array.isArray(out.rows)) return fail("T7.1", "compute", out, "Missing rows");
        if (out.rows.length === 0) return partial("T7.1", "compute", out, "Empty results");
        const first = out.rows[0];
        const hasComposite = "composite_score" in first || "computed_score" in first;
        if (!hasComposite) return partial("T7.1", "compute", out, `No composite_score — keys: ${Object.keys(first).join(",")}`);
        const score = first.composite_score ?? first.computed_score;
        return ok("T7.1", "compute", out,
          `${out.rows.length} scored rows, top composite_score=${score}, total=${out.total_scored}`);
      },
    );

    // Compute without weights (expected error)
    await run(
      "T7.2",
      "Compute: no weights (expect validation error)",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "compute" }, "t7.2"),
      (out: any) => {
        if (isErr(out) && out.message?.includes("weight"))
          return ok("T7.2", "compute no-weights error", out, `Correct validation: ${out.message}`);
        if (isErr(out))
          return partial("T7.2", "compute no-weights error", out, `Error but unclear: ${out.message}`);
        return fail("T7.2", "compute no-weights error", out, "Expected error, got success");
      },
    );
  }

  // ====================================================================
  // GROUP 8: analyzeCohort — correlation
  // ====================================================================
  console.log("\n─── GROUP 8: analyzeCohort(correlation) ───");

  if (cohortId) {
    await run(
      "T8.1",
      "Correlation: cadd_phred vs revel",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "correlation", x: "cadd_phred", y: "revel" }, "t8.1"),
      (out: any) => {
        if (isErr(out)) return fail("T8.1", "correlation", out, `API error: ${out.message}`);
        if (out.r == null) return fail("T8.1", "correlation", out, "Missing r (correlation coefficient)");
        if (out.n == null) return fail("T8.1", "correlation", out, "Missing n (sample size)");
        const r = out.r as number;
        if (r < -1 || r > 1) return fail("T8.1", "correlation", out, `Invalid r=${r} (must be -1..1)`);
        return ok("T8.1", "correlation", out,
          `r=${r.toFixed(4)}, n=${out.n}, x_mean=${out.x_mean?.toFixed(2)}, y_mean=${out.y_mean?.toFixed(2)}`);
      },
    );

    await run(
      "T8.2",
      "Correlation: cadd_phred vs apc_conservation",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "correlation", x: "cadd_phred", y: "apc_conservation" }, "t8.2"),
      (out: any) => {
        if (isErr(out)) return fail("T8.2", "correlation 2", out, `API error: ${out.message}`);
        if (out.r == null) return fail("T8.2", "correlation 2", out, "Missing r");
        return ok("T8.2", "correlation 2", out, `r=${(out.r as number).toFixed(4)}, n=${out.n}`);
      },
    );

    // Correlation missing y (expected error)
    await run(
      "T8.3",
      "Correlation: missing y (expect validation error)",
      () => exec(analyzeCohort, { cohortId: cohortId!, operation: "correlation", x: "cadd_phred" }, "t8.3"),
      (out: any) => {
        if (isErr(out)) return ok("T8.3", "correlation no-y error", out, `Correct error: ${out.message}`);
        return fail("T8.3", "correlation no-y error", out, "Expected error for missing y, got success");
      },
    );
  }

  // ====================================================================
  // GROUP 9: lookupVariant
  // ====================================================================
  console.log("\n─── GROUP 9: lookupVariant ───");

  await run(
    "T9.1",
    "Lookup: rs429358 (standard depth)",
    () => exec(lookupVariant, { identifier: "rs429358", depth: "standard" }, "t9.1"),
    (out: any) => {
      if (isErr(out)) return fail("T9.1", "lookupVariant", out, `API error: ${out.message}`);
      // rs429358 may be ambiguous (maps to multiple alleles)
      if (out.ambiguous) return ok("T9.1", "lookupVariant", out, `Ambiguous: ${out.candidates?.length} candidates`);
      // Otherwise should have variant data
      if (typeof out === "string") return ok("T9.1", "lookupVariant", out, `Got string response (${out.length} chars)`);
      return ok("T9.1", "lookupVariant", out, `Got response — keys: ${Object.keys(out).slice(0, 8).join(",")}`);
    },
  );

  await run(
    "T9.2",
    "Lookup: rs7412 (minimal depth)",
    () => exec(lookupVariant, { identifier: "rs7412", depth: "minimal" }, "t9.2"),
    (out: any) => {
      if (isErr(out)) return fail("T9.2", "lookupVariant minimal", out, `API error: ${out.message}`);
      return ok("T9.2", "lookupVariant minimal", out, `Minimal depth response received`);
    },
  );

  await run(
    "T9.3",
    "Lookup: nonexistent variant (error handling)",
    () => exec(lookupVariant, { identifier: "rs999999999999" }, "t9.3"),
    (out: any) => {
      if (isErr(out)) return ok("T9.3", "lookupVariant error", out, `Correct error: ${out.message?.slice(0, 80)}`);
      return partial("T9.3", "lookupVariant error", out, "Expected error for nonexistent variant");
    },
  );

  // ====================================================================
  // GROUP 10: getGeneVariantStats
  // ====================================================================
  console.log("\n─── GROUP 10: getGeneVariantStats ───");

  await run(
    "T10.1",
    "Gene stats: BRCA1",
    () => exec(getGeneVariantStats, { gene: "BRCA1" }, "t10.1"),
    (out: any) => {
      if (isErr(out)) return fail("T10.1", "geneVariantStats", out, `API error: ${out.message}`);
      if (!out.gene) return fail("T10.1", "geneVariantStats", out, "Missing gene field");
      if (out.totalVariants == null) return fail("T10.1", "geneVariantStats", out, "Missing totalVariants");
      const checks: string[] = [];
      if (!out.clinvar) checks.push("missing clinvar");
      if (!out.consequence) checks.push("missing consequence");
      if (!out.frequency) checks.push("missing frequency");
      if (!out.scores) checks.push("missing scores");
      if (checks.length) return partial("T10.1", "geneVariantStats", out, checks.join(", "));
      return ok("T10.1", "geneVariantStats", out,
        `gene=${out.gene}, totalVariants=${out.totalVariants}, pathogenic=${out.clinvar.pathogenic}, actionable=${out.actionable}`);
    },
  );

  await run(
    "T10.2",
    "Gene stats: TP53",
    () => exec(getGeneVariantStats, { gene: "TP53" }, "t10.2"),
    (out: any) => {
      if (isErr(out)) return fail("T10.2", "geneVariantStats TP53", out, `API error: ${out.message}`);
      if (!out.gene || out.totalVariants == null) return fail("T10.2", "geneVariantStats TP53", out, "Missing key fields");
      return ok("T10.2", "geneVariantStats TP53", out,
        `gene=${out.gene}, totalVariants=${out.totalVariants}, lof=${out.consequence?.lof}, missense=${out.consequence?.missense}`);
    },
  );

  await run(
    "T10.3",
    "Gene stats: nonexistent gene (error handling)",
    () => exec(getGeneVariantStats, { gene: "FAKEGENE12345" }, "t10.3"),
    (out: any) => {
      if (isErr(out)) return ok("T10.3", "geneVariantStats error", out, `Correct error: ${out.message?.slice(0, 80)}`);
      // Some APIs return zero stats instead of error
      if (out.totalVariants === 0) return ok("T10.3", "geneVariantStats error", out, "Zero variants (acceptable)");
      return partial("T10.3", "geneVariantStats error", out, "Expected error or zero variants");
    },
  );

  // ====================================================================
  // GROUP 11: getGwasAssociations
  // ====================================================================
  console.log("\n─── GROUP 11: getGwasAssociations ───");

  await run(
    "T11.1",
    "GWAS: rs7903146 (T2D variant)",
    () => exec(getGwasAssociations, { variant: "rs7903146", limit: 20 }, "t11.1"),
    (out: any) => {
      if (isErr(out)) return fail("T11.1", "gwas rs7903146", out, `API error: ${out.message}`);
      // Could be flat array (≤10) or object with topAssociations (>10)
      const assocs = Array.isArray(out) ? out : out.topAssociations;
      if (!assocs?.length) return partial("T11.1", "gwas rs7903146", out, "No associations found");
      const first = assocs[0];
      if (!first.trait) return partial("T11.1", "gwas rs7903146", out, "Missing trait field");
      if (first.pValueMlog == null) return partial("T11.1", "gwas rs7903146", out, "Missing pValueMlog");
      const totalHits = out.totalHits ?? assocs.length;
      return ok("T11.1", "gwas rs7903146", out,
        `${totalHits} hits, top trait="${first.trait}", -log10(p)=${first.pValueMlog}`);
    },
  );

  await run(
    "T11.2",
    "GWAS: gene:APOE (gene reference format)",
    () => exec(getGwasAssociations, { variant: "gene:APOE", limit: 10 }, "t11.2"),
    (out: any) => {
      if (isErr(out)) return partial("T11.2", "gwas gene:APOE", out, `API error: ${out.message}`);
      const assocs = Array.isArray(out) ? out : out.topAssociations;
      if (!assocs?.length) return partial("T11.2", "gwas gene:APOE", out, "No associations found");
      return ok("T11.2", "gwas gene:APOE", out, `${assocs.length} associations for APOE`);
    },
  );

  await run(
    "T11.3",
    "GWAS: with trait filter",
    () => exec(getGwasAssociations, { variant: "rs429358", traitContains: "alzheimer", limit: 20 }, "t11.3"),
    (out: any) => {
      if (isErr(out)) return partial("T11.3", "gwas trait filter", out, `API error (may be no Alzheimer hits): ${out.message}`);
      const assocs = Array.isArray(out) ? out : out.topAssociations;
      return ok("T11.3", "gwas trait filter", out, `${assocs?.length ?? 0} Alzheimer-related associations`);
    },
  );

  await run(
    "T11.4",
    "GWAS: nonexistent variant (error handling)",
    () => exec(getGwasAssociations, { variant: "rs999999999999" }, "t11.4"),
    (out: any) => {
      if (isErr(out)) return ok("T11.4", "gwas error", out, `Correct error: ${out.message?.slice(0, 80)}`);
      const assocs = Array.isArray(out) ? out : out.topAssociations;
      if (!assocs?.length) return ok("T11.4", "gwas error", out, "Empty results (acceptable)");
      return partial("T11.4", "gwas error", out, "Expected no results");
    },
  );

  // ====================================================================
  // GROUP 12: variantBatchSummary
  // ====================================================================
  console.log("\n─── GROUP 12: variantBatchSummary ───");

  await run(
    "T12.1",
    "Batch summary: 10 variants",
    () => exec(variantBatchSummary, { variants: TEST_VARIANTS.slice(0, 10), highlightLimit: 5 }, "t12.1"),
    (out: any) => {
      if (isErr(out)) return fail("T12.1", "batchSummary", out, `API error: ${out.message}`);
      if (!out.resolution) return fail("T12.1", "batchSummary", out, "Missing resolution");
      const checks: string[] = [];
      if (!out.textSummary) checks.push("missing textSummary");
      if (!out.byGene?.length) checks.push("missing byGene");
      if (!out.byConsequence?.length) checks.push("missing byConsequence");
      if (checks.length) return partial("T12.1", "batchSummary", out, checks.join(", "));
      return ok("T12.1", "batchSummary", out,
        `resolved=${out.resolution.found}/${out.resolution.total}, genes=${out.byGene.length}, consequences=${out.byConsequence.length}, highlights=${out.highlights?.length ?? 0}`);
    },
  );

  await run(
    "T12.2",
    "Batch summary: all 20 variants",
    () => exec(variantBatchSummary, { variants: TEST_VARIANTS, highlightLimit: 10 }, "t12.2"),
    (out: any) => {
      if (isErr(out)) return fail("T12.2", "batchSummary 20", out, `API error: ${out.message}`);
      if (!out.resolution) return fail("T12.2", "batchSummary 20", out, "Missing resolution");
      return ok("T12.2", "batchSummary 20", out,
        `resolved=${out.resolution.found}/${out.resolution.total}, byGene=${out.byGene?.length}, byClinSig=${out.byClinicalSignificance?.length}, byFreq=${out.byFrequency?.length}`);
    },
  );

  // ====================================================================
  // GROUP 13: Full pipeline chain
  // ====================================================================
  console.log("\n─── GROUP 13: Full pipeline chain ───");

  if (cohortId) {
    // Simulate: derive(rare+pathogenic) → prioritize on derived → rows top 5
    let pipelineDerivedId: string | null = null;

    const pipelineDerive = await run(
      "T13.1",
      "Pipeline: derive rare pathogenic subset",
      () => exec(analyzeCohort, {
        cohortId: cohortId!,
        operation: "derive",
        filters: [
          { type: "score_below" as const, field: "gnomad_af" as any, threshold: 0.05 },
        ],
        label: "rare-subset",
      }, "t13.1"),
      (out: any) => {
        if (isErr(out)) return fail("T13.1", "pipeline derive", out, `API error: ${out.message}`);
        if (!out.derivedCohortId) return fail("T13.1", "pipeline derive", out, "No derivedCohortId");
        return ok("T13.1", "pipeline derive", out,
          `derivedId=${out.derivedCohortId}, count=${out.variantCount}`);
      },
    );

    if (pipelineDerive && !isErr(pipelineDerive)) {
      pipelineDerivedId = (pipelineDerive as any).derivedCohortId;
    }

    if (pipelineDerivedId) {
      await run(
        "T13.2",
        "Pipeline: prioritize derived cohort by CADD+REVEL",
        () => exec(analyzeCohort, {
        cohortId: pipelineDerivedId!,
        operation: "prioritize",
        criteria: [
          { column: "cadd_phred", desc: true, weight: 2 },
          { column: "revel", desc: true, weight: 1 },
        ],
        limit: 5,
      }, "t13.2"),
        (out: any) => {
          if (isErr(out)) return fail("T13.2", "pipeline prioritize", out, `API error: ${out.message}`);
          if (!Array.isArray(out.rows)) return fail("T13.2", "pipeline prioritize", out, "Missing rows");
          return ok("T13.2", "pipeline prioritize", out,
            `${out.rows.length} prioritized from derived cohort`);
        },
      );

      await run(
        "T13.3",
        "Pipeline: groupby gene on derived cohort",
        () => exec(analyzeCohort, { cohortId: pipelineDerivedId!, operation: "groupby", group_by: "gene" }, "t13.3"),
        (out: any) => {
          if (isErr(out)) return fail("T13.3", "pipeline groupby", out, `API error: ${out.message}`);
          if (!Array.isArray(out.buckets)) return fail("T13.3", "pipeline groupby", out, "Missing buckets");
          return ok("T13.3", "pipeline groupby", out,
            `${out.buckets.length} genes in rare subset`);
        },
      );
    }
  }

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
      `${r.id.padEnd(6)} | ${emoji} ${r.grade.padEnd(7)} | ${r.elapsed.toFixed(1).padStart(4)}s | ${r.name}`,
    );
  }
  console.log("─".repeat(70));
  const pass = results.filter((r) => r.grade === "PASS").length;
  const partial_ = results.filter((r) => r.grade === "PARTIAL").length;
  const fail_ = results.filter((r) => r.grade === "FAIL").length;
  console.log(`Total: ${pass} PASS, ${partial_} PARTIAL, ${fail_} FAIL out of ${results.length}`);

  // Failure details
  const failures = results.filter((r) => r.grade !== "PASS");
  if (failures.length > 0) {
    console.log("\n\nFAILURE/PARTIAL DETAILS:");
    for (const f of failures) {
      console.log(`\n  ${f.id}: ${f.name}`);
      console.log(`    Grade: ${f.grade}`);
      console.log(`    Notes: ${f.notes}`);
    }
  }

  // Save results
  writeFileSync(
    "scripts/stress-test-variant-tools-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\n\nFull results → scripts/stress-test-variant-tools-results.json");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
