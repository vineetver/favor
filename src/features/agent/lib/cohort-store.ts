/**
 * Lightweight cohort persistence for the agent workspace sidebar.
 * Stores cohorts created via paste, upload, or agent tool in localStorage.
 */

export interface AgentCohort {
  cohortId: string;
  label: string;
  variantCount: number;
  source: "paste" | "upload" | "agent";
  createdAt: string;
  /** Session IDs of conversations linked to this cohort (newest first) */
  sessionIds: string[];
}

const STORAGE_KEY = "favor_agent_cohorts";
const MAX_COHORTS = 50;

// ---------------------------------------------------------------------------
// Migration — converts legacy `sessionId` field to `sessionIds` array
// ---------------------------------------------------------------------------

interface StoredCohortRaw {
  cohortId: string;
  label: string;
  variantCount: number;
  source: "paste" | "upload" | "agent";
  createdAt: string;
  sessionId?: string;
  sessionIds?: string[];
}

function migrate(raw: StoredCohortRaw): AgentCohort {
  const sessionIds = Array.isArray(raw.sessionIds) ? [...raw.sessionIds] : [];
  if (raw.sessionId && !sessionIds.includes(raw.sessionId)) {
    sessionIds.unshift(raw.sessionId);
  }
  return {
    cohortId: raw.cohortId,
    label: raw.label,
    variantCount: raw.variantCount,
    source: raw.source,
    createdAt: raw.createdAt,
    sessionIds,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getStoredCohorts(): AgentCohort[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const raw: StoredCohortRaw[] = data ? JSON.parse(data) : [];
    return raw.map(migrate);
  } catch {
    return [];
  }
}

export function saveStoredCohorts(cohorts: AgentCohort[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cohorts.slice(0, MAX_COHORTS)),
    );
  } catch {
    /* storage full or unavailable */
  }
}

export function addStoredCohort(cohort: AgentCohort): AgentCohort[] {
  const existing = getStoredCohorts();
  const filtered = existing.filter((c) => c.cohortId !== cohort.cohortId);
  const next = [
    { ...cohort, sessionIds: cohort.sessionIds ?? [] },
    ...filtered,
  ].slice(0, MAX_COHORTS);
  saveStoredCohorts(next);
  return next;
}

export function updateStoredCohort(
  cohortId: string,
  update: Partial<AgentCohort>,
): AgentCohort[] {
  const cohorts = getStoredCohorts();
  const next = cohorts.map((c) =>
    c.cohortId === cohortId ? { ...c, ...update } : c,
  );
  saveStoredCohorts(next);
  return next;
}

/** Add a session ID to a cohort's sessionIds list (newest first, no duplicates). */
export function addSessionToCohort(
  cohortId: string,
  sessionId: string,
): AgentCohort[] {
  const cohorts = getStoredCohorts();
  const next = cohorts.map((c) => {
    if (c.cohortId !== cohortId) return c;
    if (c.sessionIds.includes(sessionId)) return c;
    return { ...c, sessionIds: [sessionId, ...c.sessionIds] };
  });
  saveStoredCohorts(next);
  return next;
}

export function removeStoredCohort(cohortId: string): AgentCohort[] {
  const next = getStoredCohorts().filter((c) => c.cohortId !== cohortId);
  saveStoredCohorts(next);
  return next;
}
