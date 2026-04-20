import type { ActiveIncident, Impact, IncidentState, Scope } from "../types";

const COMPONENTS_URL = "https://nerc.instatus.com/v2/components.json";

const IMPACT_MAP: Record<string, Impact> = {
  OPERATIONAL: "operational",
  MINOROUTAGE: "minor",
  PARTIALOUTAGE: "minor",
  DEGRADEDPERFORMANCE: "minor",
  MAJOROUTAGE: "major",
  UNDERMAINTENANCE: "maintenance",
};

const STATE_MAP: Record<string, IncidentState> = {
  INVESTIGATING: "investigating",
  IDENTIFIED: "identified",
  MONITORING: "monitoring",
  RESOLVED: "resolved",
};

interface RawIncident {
  id: string;
  name: string;
  status: string;
  started: string;
  impact: string;
  url: string;
}

interface RawComponent {
  id: string;
  name: string;
  status: string;
  group: { name?: string } | null;
  activeIncidents?: RawIncident[];
}

function scopeForComponent(c: RawComponent): Scope {
  const haystack = `${c.group?.name ?? ""} ${c.name}`.toUpperCase();
  if (haystack.includes("OPENSHIFT")) return "openshift";
  if (haystack.includes("OPENSTACK")) return "openstack";
  return "other";
}

export async function fetchNerc(): Promise<ActiveIncident[]> {
  const res = await fetch(COMPONENTS_URL, {
    signal: AbortSignal.timeout(4000),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`nerc ${res.status}`);
  const { components } = (await res.json()) as { components: RawComponent[] };

  const scopesById = new Map<string, Set<Scope>>();
  const metaById = new Map<string, RawIncident>();

  for (const component of components) {
    const scope = scopeForComponent(component);
    for (const inc of component.activeIncidents ?? []) {
      if (!scopesById.has(inc.id)) {
        scopesById.set(inc.id, new Set());
        metaById.set(inc.id, inc);
      }
      scopesById.get(inc.id)?.add(scope);
    }
  }

  return Array.from(metaById.entries()).map(([id, inc]) => ({
    id: `nerc:${id}`,
    source: "nerc" as const,
    name: inc.name,
    impact: IMPACT_MAP[inc.impact] ?? "minor",
    state: STATE_MAP[inc.status] ?? "investigating",
    scopes: Array.from(scopesById.get(id) ?? []),
    url: inc.url,
    startedAt: inc.started,
  }));
}
