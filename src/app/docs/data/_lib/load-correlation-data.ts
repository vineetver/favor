/* ------------------------------------------------------------------ */
/*  One-shot DuckDB-WASM loader for the correlation parquet + JSONs     */
/*                                                                      */
/*  Dynamically imports @duckdb/duckdb-wasm (already in package.json)   */
/*  to avoid webpack bundling it with non-client code.                  */
/* ------------------------------------------------------------------ */

import {
  CATEGORY_DISPLAY,
  type CategoryDisplay,
  prettifyAnnotation,
} from "./correlation-display";

/* ------------------------------------------------------------------ */
/*  Public types                                                        */
/* ------------------------------------------------------------------ */

export interface CategoryDef {
  key: string;
  label: string;
  color: string;
  startIdx: number;
  count: number;
}

export interface AnnotationDef {
  label: string;
  displayLabel: string;
  category: number; // index into categories[]
  scale: string;
}

export interface CorrelationData {
  categories: CategoryDef[];
  annotations: AnnotationDef[];
  labelToIndex: Map<string, number>;
  /** Symmetric n×n row-major (functional annotations only). Access: matrix[i * n + j] */
  matrix: Float32Array;
  n: number;
}

/* ------------------------------------------------------------------ */
/*  JSON shapes (from the data files)                                   */
/* ------------------------------------------------------------------ */

interface OrderCategory {
  name: string;
  annotations: string[];
}

interface OrderJSON {
  categories: OrderCategory[];
  all_in_order: string[];
}

interface MetaEntry {
  path: string;
  label: string;
  dtype: string;
  category: string;
  scale: string;
}

/* ------------------------------------------------------------------ */
/*  Category filtering & display                                        */
/*                                                                      */
/*  The correlation parquet has 222 annotations across 19 categories.    */
/*  The heatmap only shows *functional* annotations — allele frequency   */
/*  categories are excluded.                                             */
/* ------------------------------------------------------------------ */

const EXCLUDED_CATEGORIES = new Set([
  "AlleleFrequency", // population frequencies, not functional
  "FilteringAF", // gnomAD filtering AFs
  "GnomadFunctional", // gnomAD's bundled scores (pangolin, revel, spliceai)
]);

const FALLBACK_COLOR = "#71717a"; // zinc-500

function getCategoryDisplay(key: string): CategoryDisplay {
  return (
    CATEGORY_DISPLAY[key] ?? {
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2"),
      color: FALLBACK_COLOR,
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Loader                                                              */
/* ------------------------------------------------------------------ */

const BASE = "/data/correlation-matrix";

export async function loadCorrelationData(): Promise<CorrelationData> {
  // 1. Fetch the three files + DuckDB-WASM module in parallel
  const [orderRes, metaRes, parquetRes, duckdb] = await Promise.all([
    fetch(`${BASE}/annotation_order.json`),
    fetch(`${BASE}/annotation_meta.json`),
    fetch(`${BASE}/favor_v2026_1_annotation_correlations.parquet`),
    import("@duckdb/duckdb-wasm"),
  ]);

  if (!orderRes.ok)
    throw new Error(
      `Failed to fetch annotation_order.json: ${orderRes.status}`,
    );
  if (!metaRes.ok)
    throw new Error(`Failed to fetch annotation_meta.json: ${metaRes.status}`);
  if (!parquetRes.ok)
    throw new Error(`Failed to fetch parquet: ${parquetRes.status}`);

  const [orderJSON, metaJSON, parquetBuf] = await Promise.all([
    orderRes.json() as Promise<OrderJSON>,
    metaRes.json() as Promise<MetaEntry[]>,
    parquetRes.arrayBuffer(),
  ]);

  // 2. Build annotation order + categories (functional only)
  const metaByLabel = new Map<string, MetaEntry>();
  for (const m of metaJSON) metaByLabel.set(m.label, m);

  const categories: CategoryDef[] = [];
  const annotations: AnnotationDef[] = [];
  const labelToIndex = new Map<string, number>();

  let offset = 0;
  for (const cat of orderJSON.categories) {
    if (EXCLUDED_CATEGORIES.has(cat.name)) continue;

    const display = getCategoryDisplay(cat.name);
    const catIdx = categories.length;
    categories.push({
      key: cat.name,
      label: display.label,
      color: display.color,
      startIdx: offset,
      count: cat.annotations.length,
    });
    for (const label of cat.annotations) {
      const meta = metaByLabel.get(label);
      labelToIndex.set(label, annotations.length);
      annotations.push({
        label,
        displayLabel: prettifyAnnotation(label),
        category: catIdx,
        scale: meta?.scale ?? "continuous",
      });
    }
    offset += cat.annotations.length;
  }

  const n = annotations.length;

  // 3. Init DuckDB-WASM (one-shot, no singleton)
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  if (!bundle.mainWorker) throw new Error("No worker bundle available");

  const workerResponse = await fetch(bundle.mainWorker);
  const workerBlob = await workerResponse.blob();
  const workerUrl = URL.createObjectURL(workerBlob);
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();

  // 4. Register the parquet and query it
  const uint8 = new Uint8Array(parquetBuf);
  await db.registerFileBuffer("corr.parquet", uint8);

  const result = await conn.query(
    `SELECT annotation_x, annotation_y, pearson_r FROM read_parquet('corr.parquet')`,
  );

  // 5. Build symmetric matrix
  const matrix = new Float32Array(n * n);
  // diagonal = 1.0
  for (let i = 0; i < n; i++) matrix[i * n + i] = 1.0;

  const xCol = result.getChild("annotation_x");
  const yCol = result.getChild("annotation_y");
  const rCol = result.getChild("pearson_r");

  if (!xCol || !yCol || !rCol)
    throw new Error("Parquet missing expected columns");

  for (let row = 0; row < result.numRows; row++) {
    const x = xCol.get(row) as string;
    const y = yCol.get(row) as string;
    const r = rCol.get(row) as number;

    const i = labelToIndex.get(x);
    const j = labelToIndex.get(y);
    if (i === undefined || j === undefined) continue;
    if (i === j) continue; // diagonal already 1.0

    matrix[i * n + j] = r;
    matrix[j * n + i] = r;
  }

  // 6. Tear down DuckDB
  await conn.close();
  await db.terminate();
  worker.terminate();
  URL.revokeObjectURL(workerUrl);

  return { categories, annotations, labelToIndex, matrix, n };
}
