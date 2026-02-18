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
}

const STORAGE_KEY = "favor_agent_cohorts";
const MAX_COHORTS = 50;

export function getStoredCohorts(): AgentCohort[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
  const next = [cohort, ...filtered].slice(0, MAX_COHORTS);
  saveStoredCohorts(next);
  return next;
}

export function removeStoredCohort(cohortId: string): AgentCohort[] {
  const next = getStoredCohorts().filter((c) => c.cohortId !== cohortId);
  saveStoredCohorts(next);
  return next;
}
