import type {
  JobResponse,
  Prediction,
  RegionRequest,
  RegionResult,
  ScoreRequest,
  ScoreResult,
  VariantTrackRequest,
  VariantTrackResult,
} from "./types";

const API_BASE = "/api/v1";
const PREDICT_BASE = `${API_BASE}/predict`;
const POLL_INTERVAL_MS = 10_000;

/** Ensure poll_url goes through the API proxy (backend returns bare /predict/... paths). */
function resolvePollUrl(pollUrl: string): string {
  if (pollUrl.startsWith(API_BASE)) return pollUrl;
  if (pollUrl.startsWith("/")) return `${API_BASE}${pollUrl}`;
  return pollUrl;
}

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

/** Sleep that respects an AbortSignal. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

/**
 * Submit a prediction job and poll until done.
 *
 * Flow:
 *  1. POST → 200 (cached, done immediately) or 202 (running)
 *  2. If running, poll GET poll_url every 10s until done/failed
 *  3. Fetch the S3 artifact from the returned url
 *
 * Accepts an AbortSignal so React Query can cancel when the component unmounts.
 */
async function fetchPrediction<T>(
  endpoint: string,
  body: object,
  signal?: AbortSignal,
): Promise<Prediction<T>> {
  const res = await fetch(`${PREDICT_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok && res.status !== 202) {
    const text = await res.text().catch(() => "");
    if (res.status === 408) throw new Error("Prediction timed out — try fewer modalities or a smaller region");
    if (res.status === 502 || res.status === 503) throw new Error("AlphaGenome service is currently unavailable");
    throw new Error(`Prediction failed (${res.status}): ${text}`);
  }

  let job: JobResponse;
  try {
    job = await readJson<JobResponse>(res);
  } catch {
    throw new Error("AlphaGenome service is currently unavailable");
  }

  // Poll until done or failed
  while (job.status === "running") {
    await abortableSleep(POLL_INTERVAL_MS, signal);
    let poll: Response;
    try {
      poll = await fetch(resolvePollUrl(job.poll_url), { signal });
    } catch (e) {
      if (signal?.aborted) throw e; // let React Query handle abort
      throw new Error("Lost connection to AlphaGenome service");
    }
    if (poll.status === 502 || poll.status === 503) {
      throw new Error("AlphaGenome service is currently unavailable");
    }
    if (!poll.ok) {
      throw new Error("AlphaGenome service is currently unavailable");
    }
    job = await readJson<JobResponse>(poll);
  }

  if (job.status === "failed") {
    throw new Error(job.error ?? "Prediction failed");
  }

  // status === "done" — fetch the S3 artifact
  const url = job.url!;
  const cached = job.cached ?? false;

  // Fetch artifact — retry once on 404 (S3 propagation delay).
  // S3 URLs are immutable per computation, so force-cache lets the browser
  // skip the network entirely on revisit / page refresh.
  let artifact = await fetch(url, { signal, cache: "force-cache" });
  if (artifact.status === 404) {
    await abortableSleep(2000, signal);
    artifact = await fetch(url, { signal, cache: "force-cache" });
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
  signal?: AbortSignal,
): Promise<Prediction<VariantTrackResult>> {
  return fetchPrediction("variant", req, signal);
}

export function predictScores(
  req: ScoreRequest,
  signal?: AbortSignal,
): Promise<Prediction<ScoreResult>> {
  return fetchPrediction("scores", req, signal);
}

export function predictRegion(
  req: RegionRequest,
  signal?: AbortSignal,
): Promise<Prediction<RegionResult>> {
  return fetchPrediction("region", req, signal);
}
