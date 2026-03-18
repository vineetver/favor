import type {
  Prediction,
  PredictResponse,
  RegionRequest,
  RegionResult,
  ScoreRequest,
  ScoreResult,
  VariantTrackRequest,
  VariantTrackResult,
} from "./types";

const PREDICT_BASE = "/api/v1/predict";

/**
 * Parse JSON that may contain non-standard tokens (NaN, Infinity).
 * Python's json.dumps can emit these; JS JSON.parse rejects them.
 */
function parseLooseJson<T>(text: string): T {
  return JSON.parse(
    text.replace(/\bNaN\b/g, "null").replace(/\b-?Infinity\b/g, "null"),
  );
}

/** Read a Response body as parsed JSON, tolerating NaN/Infinity. */
async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return parseLooseJson<T>(text);
}

/**
 * Two-step fetch: POST → presigned S3 URL → gzipped artifact.
 * Returns { data, cached } so the UI can show a cached badge.
 */
async function fetchPrediction<T>(
  endpoint: string,
  body: object,
): Promise<Prediction<T>> {
  const res = await fetch(`${PREDICT_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 408) throw new Error("Prediction timed out — try fewer modalities or a smaller region");
    if (res.status === 503) throw new Error("AlphaGenome service is currently unavailable");
    throw new Error(`Prediction failed (${res.status}): ${text}`);
  }

  const payload = await readJson<Record<string, unknown>>(res);

  // Backend may return data inline (no S3 URL)
  if (!payload.url) {
    return { data: payload as T, cached: false };
  }

  const { url, cached } = payload as unknown as PredictResponse;

  // Fetch artifact from S3 — retry once on 404 (propagation delay)
  let artifact = await fetch(url);
  if (artifact.status === 404) {
    await new Promise((r) => setTimeout(r, 2000));
    artifact = await fetch(url);
  }

  if (!artifact.ok) {
    throw new Error(
      artifact.status === 404
        ? "Prediction artifact not found — the model may still be computing"
        : `Failed to fetch prediction artifact (${artifact.status})`,
    );
  }

  // S3 may serve raw gzip without Content-Encoding header
  const ct = artifact.headers.get("content-type") ?? "";
  if (ct.includes("gzip") || ct === "application/octet-stream") {
    const ds = new DecompressionStream("gzip");
    const decompressed = new Response(artifact.body!.pipeThrough(ds));
    const data = await readJson<T>(decompressed);
    return { data, cached };
  }

  const data = await readJson<T>(artifact);
  return { data, cached };
}

export function predictVariantTracks(
  req: VariantTrackRequest,
): Promise<Prediction<VariantTrackResult>> {
  return fetchPrediction("variant", req);
}

export function predictScores(
  req: ScoreRequest,
): Promise<Prediction<ScoreResult>> {
  return fetchPrediction("scores", req);
}

export function predictRegion(
  req: RegionRequest,
): Promise<Prediction<RegionResult>> {
  return fetchPrediction("region", req);
}
