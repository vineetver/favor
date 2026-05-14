import { JSONParser } from "@streamparser/json";
import { API_BASE } from "@/config/api";
import { parseVariantTrackResult } from "./parse";
import type {
  IntervalScoreRequest,
  IntervalScoreResult,
  JobResponse,
  Prediction,
  RegionRequest,
  RegionResult,
  ScoreRequest,
  ScoreResult,
  VariantTrackRequest,
  VariantTrackResult,
} from "./types";

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

/** Strip query string + auth params from a URL before logging. */
function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split("?")[0] || url;
  }
}

/**
 * Parse a UTF-8 byte stream as JSON without ever materializing the full
 * text in JS memory. Built on @streamparser/json: feeds chunks through a
 * tokenizer that assembles the result object directly from the token
 * stream. Sidesteps V8's max string length (~512 MiB), which Response.json()
 * hits on large artifacts because it builds the full text first.
 *
 * `paths: ["$"]` makes the parser emit a single root value once parsing
 * completes; we resolve with it.
 */
async function streamParseJson<T>(
  stream: ReadableStream<Uint8Array>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const parser = new JSONParser({ paths: ["$"], keepStack: false });
    let root: T | undefined;
    parser.onValue = ({ value }) => {
      root = value as T;
    };
    parser.onError = (err) => reject(err);
    parser.onEnd = () => {
      if (root === undefined) {
        reject(new Error("Stream ended without a root JSON value"));
      } else {
        resolve(root);
      }
    };

    (async () => {
      const reader = stream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) parser.write(value);
        }
        parser.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
}

/**
 * Read a Response body as parsed JSON, tolerating NaN/Infinity.
 *
 * On failure (empty body, HTML error page, malformed JSON) throws an Error
 * carrying enough context to debug without opening devtools: the labelled
 * step, request URL (auth-stripped), status, content-type, body length,
 * and first ~200 chars of the response.
 */
async function readJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text().catch(() => "");
  const ct = response.headers.get("content-type") ?? "(none)";
  const ctx = `${response.status} ${safeUrl(response.url)} | content-type=${ct} | bytes=${text.length}`;

  if (text.length === 0) {
    throw new Error(`${label}: empty response body | ${ctx}`);
  }
  try {
    return parseLooseJson<T>(text);
  } catch (e) {
    const excerpt = text.slice(0, 200).replace(/\s+/g, " ");
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `${label}: invalid JSON (${reason}) | ${ctx} | body[0..200]="${excerpt}"`,
    );
  }
}

/** Sleep that respects an AbortSignal. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
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
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok && res.status !== 202) {
    const text = await res.text().catch(() => "");
    if (res.status === 408)
      throw new Error(
        "Prediction timed out — try fewer modalities or a smaller region",
      );
    if (res.status === 502 || res.status === 503)
      throw new Error("AlphaGenome service is currently unavailable");
    throw new Error(`Prediction failed (${res.status}): ${text}`);
  }

  // Don't swallow parse failures — readJson already carries full context.
  let job: JobResponse = await readJson<JobResponse>(
    res,
    `POST /predict/${endpoint}`,
  );

  // Poll until done or failed
  while (job.status === "running") {
    await abortableSleep(POLL_INTERVAL_MS, signal);
    let poll: Response;
    try {
      poll = await fetch(resolvePollUrl(job.poll_url), {
        credentials: "include",
        signal,
      });
    } catch (e) {
      if (signal?.aborted) throw e; // let React Query handle abort
      throw new Error("Lost connection to AlphaGenome service");
    }
    if (!poll.ok) {
      const body = await poll.text().catch(() => "");
      throw new Error(
        `Poll failed: ${poll.status} ${poll.statusText} | url=${safeUrl(job.poll_url)} | body[0..200]="${body.slice(0, 200).replace(/\s+/g, " ")}"`,
      );
    }
    job = await readJson<JobResponse>(poll, `GET ${safeUrl(job.poll_url)}`);
  }

  if (job.status === "failed") {
    throw new Error(job.error ?? "Prediction failed");
  }

  // status === "done" — fetch the S3 artifact
  const url = job.url!;
  const cached = job.cached ?? false;

  // Fetch artifact. Bypass HTTP cache: stale/incomplete prior responses
  // (e.g. a previous CORS-blocked or zero-byte fetch) can be returned by
  // force-cache, which silently produces empty bodies. Re-fetch every time;
  // the signed URL is short-lived anyway.
  let artifact = await fetch(url, { signal, cache: "no-store" });
  if (artifact.status === 404) {
    await abortableSleep(2000, signal);
    artifact = await fetch(url, { signal, cache: "no-store" });
  }

  if (!artifact.ok) {
    const body = await artifact.text().catch(() => "");
    throw new Error(
      artifact.status === 404
        ? "Prediction artifact not found — the model may still be computing"
        : `Artifact fetch failed: ${artifact.status} ${artifact.statusText} | url=${safeUrl(url)} | body[0..200]="${body.slice(0, 200).replace(/\s+/g, " ")}"`,
    );
  }

  // Decode + parse the body without materializing it as one giant JS
  // string. Artifacts can be ~600 MB of JSON after gzip decompression,
  // which sits past V8's max string length: Response.json() builds the
  // full text first and throws "Cannot create a string longer than
  // 0x1fffffe8 characters". Strategy: peek the first chunk to detect
  // gzip magic, build a stream (decompressed if needed), feed it to
  // streamParseJson which assembles the object directly from tokens.
  const ct = artifact.headers.get("content-type") ?? "(none)";
  const ce = artifact.headers.get("content-encoding") ?? "(none)";
  if (!artifact.body) {
    throw new Error(
      `Artifact has no body | url=${safeUrl(url)} | content-type=${ct} | content-encoding=${ce}`,
    );
  }

  const reader = artifact.body.getReader();
  const first = await reader.read();
  if (first.done || !first.value || first.value.length === 0) {
    throw new Error(
      `Artifact empty after fetch (0 bytes) | url=${safeUrl(url)} | content-type=${ct} | content-encoding=${ce}`,
    );
  }
  const firstChunk = first.value;
  const wasGzip =
    firstChunk.length >= 2 && firstChunk[0] === 0x1f && firstChunk[1] === 0x8b;

  // Re-emit the peeked chunk + the rest of the original body as a fresh
  // stream so we don't lose the first chunk.
  const stitched = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(firstChunk);
    },
    async pull(controller) {
      const next = await reader.read();
      if (next.done) controller.close();
      else if (next.value) controller.enqueue(next.value);
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });

  // DecompressionStream isn't typed as a TransformStream<Uint8Array,Uint8Array>
  // in lib.dom, even though runtime behaviour matches. Cast to bridge that.
  const decoded = wasGzip
    ? stitched.pipeThrough(
        new DecompressionStream("gzip") as unknown as ReadableWritablePair<
          Uint8Array,
          Uint8Array
        >,
      )
    : stitched;

  try {
    const data = await streamParseJson<T>(decoded);
    return { data, cached };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const firstHex = Array.from(firstChunk.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    throw new Error(
      `Artifact decode/parse failed (${reason}) | url=${safeUrl(url)} | gzip=${wasGzip} | first-chunk-bytes=${firstChunk.length} | first-bytes=${firstHex} | content-type=${ct} | content-encoding=${ce}`,
    );
  }
}

export async function predictVariantTracks(
  req: VariantTrackRequest,
  signal?: AbortSignal,
): Promise<Prediction<VariantTrackResult>> {
  const { data, cached } = await fetchPrediction<unknown>(
    "variant",
    req,
    signal,
  );
  // Parse at the boundary — render trusts the type from here on.
  return { data: parseVariantTrackResult(data), cached };
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

export function predictIntervalScores(
  req: IntervalScoreRequest,
  signal?: AbortSignal,
): Promise<Prediction<IntervalScoreResult>> {
  return fetchPrediction("interval_scores", req, signal);
}
