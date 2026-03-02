import type { CohortListItem } from "@features/batch/types";

// ---------------------------------------------------------------------------
// Slugify (for display labels only — paths use IDs)
// ---------------------------------------------------------------------------

/** Lowercase, alphanum + hyphens, max 40 chars */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Display-friendly slug from cohort label or ID */
export function cohortSlug(cohort: CohortListItem): string {
  return cohort.label ? slugify(cohort.label) : cohort.id.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Path builders — use IDs so paths are stable + agent-usable
// ---------------------------------------------------------------------------

export function buildCohortPath(cohortId: string): string {
  return `cohort/${cohortId}`;
}

export function buildSchemaPath(cohortId: string): string {
  return `cohort/${cohortId}/schema`;
}

export function buildSamplePath(cohortId: string): string {
  return `cohort/${cohortId}/sample`;
}

export function buildDerivedFolderPath(cohortId: string): string {
  return `cohort/${cohortId}/derived`;
}

export function buildRunsFolderPath(cohortId: string): string {
  return `cohort/${cohortId}/runs`;
}

export function buildRunPath(runId: string): string {
  return `run/${runId}`;
}

export function buildVizPath(runId: string, chartId: string): string {
  return `run/${runId}/viz/${chartId}`;
}
