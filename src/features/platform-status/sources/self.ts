import type { ActiveIncident } from "../types";

function healthUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    return new URL("health", base.endsWith("/") ? base : `${base}/`).href;
  } catch {
    return null;
  }
}

// Per-attempt timeout (ms). 2500ms was firing on cold-start latency and
// transient network blips. 6s tolerates a slow first response.
const PROBE_TIMEOUT_MS = 6000;
// Probe attempts before declaring the API unreachable. A single failed
// fetch was way too sensitive — the banner went red on every minor blip.
// Three attempts with backoff means we only fire when the API is *really*
// down, not when one packet got dropped.
const PROBE_ATTEMPTS = 3;
const PROBE_BACKOFF_MS = 800;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function probeOnce(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSelf(): Promise<ActiveIncident[]> {
  const url = healthUrl();
  if (!url) return [];

  // Retry loop — return early on the first OK response, only synthesize
  // an incident after all attempts fail.
  for (let i = 0; i < PROBE_ATTEMPTS; i++) {
    if (i > 0) await sleep(PROBE_BACKOFF_MS);
    if (await probeOnce(url)) return [];
  }

  // Demoted from "major" → "minor". A failed health probe could mean
  // genuine outage, but it could equally be a transient network condition
  // between this Next process and the API. "Degraded service" yellow
  // banner conveys the right ambiguity; sustained "Service disruption"
  // red is reserved for confirmed-from-multiple-sources outages.
  const startedAt = new Date().toISOString();
  return [
    {
      id: "self:api-unreachable",
      source: "self",
      name: "FAVOR API health probe failed",
      impact: "minor",
      state: "investigating",
      scopes: ["core-api"],
      url: "/",
      startedAt,
    },
  ];
}
