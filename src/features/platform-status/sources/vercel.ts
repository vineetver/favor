import type { ActiveIncident, Impact, IncidentState } from "../types";

const VERCEL_URL = "https://www.vercel-status.com/api/v2/summary.json";

const IMPACT_MAP: Record<string, Impact> = {
  none: "operational",
  maintenance: "maintenance",
  minor: "minor",
  major: "major",
  critical: "major",
};

const STATE_MAP: Record<string, IncidentState> = {
  investigating: "investigating",
  identified: "identified",
  monitoring: "monitoring",
  resolved: "resolved",
  postmortem: "monitoring",
};

interface RawIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string;
  started_at: string;
}

interface RawSummary {
  incidents?: RawIncident[];
  scheduled_maintenances?: RawIncident[];
}

// Incidents we don't want to surface on our banner — typically because
// they don't actually affect us (e.g., regional issues outside our deploy
// region) but Vercel still lists them as active.
const SUPPRESSED_INCIDENT_IDS = new Set<string>(["r98wgd6yk2q7"]);

function isSuppressed(inc: RawIncident): boolean {
  if (SUPPRESSED_INCIDENT_IDS.has(inc.id)) return true;
  return SUPPRESSED_INCIDENT_IDS.has(
    inc.shortlink.split("/").pop() ?? "",
  );
}

export async function fetchVercel(): Promise<ActiveIncident[]> {
  const res = await fetch(VERCEL_URL, {
    signal: AbortSignal.timeout(4000),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`vercel ${res.status}`);
  const json = (await res.json()) as RawSummary;

  const active = [
    ...(json.incidents ?? []).filter(
      (i) => i.status !== "resolved" && !isSuppressed(i),
    ),
    ...(json.scheduled_maintenances ?? []).filter(
      (i) =>
        i.status !== "completed" &&
        i.status !== "resolved" &&
        !isSuppressed(i),
    ),
  ];

  return active.map((inc) => ({
    id: `vercel:${inc.id}`,
    source: "vercel" as const,
    name: inc.name,
    impact: IMPACT_MAP[inc.impact] ?? "minor",
    state: STATE_MAP[inc.status] ?? "investigating",
    scopes: ["vercel" as const],
    url: inc.shortlink,
    startedAt: inc.started_at,
  }));
}
