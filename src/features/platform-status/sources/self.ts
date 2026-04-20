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

export async function fetchSelf(): Promise<ActiveIncident[]> {
  const url = healthUrl();
  if (!url) return [];

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (res.ok) return [];
  } catch {
    // fallthrough to synthesize incident
  }

  const startedAt = new Date().toISOString();
  return [
    {
      id: "self:api-unreachable",
      source: "self",
      name: "FAVOR API is unreachable",
      impact: "major",
      state: "investigating",
      scopes: ["core-api"],
      url: "/",
      startedAt,
    },
  ];
}
