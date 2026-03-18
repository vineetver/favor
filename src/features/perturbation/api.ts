import { fetchJson } from "@infra/api";
import type { PaginatedResponse, TissueGroupRow } from "@features/enrichment/api/region";
import { inferTissueGroup } from "@shared/utils/tissue-format";
import type {
  CrisprRow,
  FetchCrisprParams,
  PerturbSeqRow,
  FetchPerturbSeqParams,
  MaveRow,
  FetchMaveParams,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function buildParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

// ---------------------------------------------------------------------------
// CRISPR
// ---------------------------------------------------------------------------

export async function fetchCrispr(
  loc: string,
  params: FetchCrisprParams = {},
): Promise<PaginatedResponse<CrisprRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/crispr${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<CrisprRow>>(url);
}

// ---------------------------------------------------------------------------
// Perturb-seq
// ---------------------------------------------------------------------------

export async function fetchPerturbSeq(
  loc: string,
  params: FetchPerturbSeqParams = {},
): Promise<PaginatedResponse<PerturbSeqRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/perturb-seq${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<PerturbSeqRow>>(url);
}

// ---------------------------------------------------------------------------
// MAVE
// ---------------------------------------------------------------------------

export async function fetchMave(
  loc: string,
  params: FetchMaveParams = {},
): Promise<PaginatedResponse<MaveRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/mave${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<MaveRow>>(url);
}

// ---------------------------------------------------------------------------
// CRISPR essentiality aggregated by tissue group
// ---------------------------------------------------------------------------

export interface CrisprTissueGroupRow extends TissueGroupRow {
  /** Number of cell lines tested in this tissue group */
  total_lines: number;
  /** Number of cell lines where gene is essential */
  essential_lines: number;
  /** Fraction essential (essential_lines / total_lines) */
  essential_fraction: number;
}

/**
 * Fetch CRISPR data and aggregate by tissue group.
 * Returns one row per tissue group with essential/total cell line counts.
 */
export async function fetchCrisprByTissueGroup(
  loc: string,
): Promise<CrisprTissueGroupRow[]> {
  // Fetch a large batch — paginate if needed
  let allRows: CrisprRow[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 5; i++) {
    const res = await fetchCrispr(loc, { limit: 100, cursor });
    allRows = allRows.concat(res.data);
    if (!res.page_info.has_more) break;
    cursor = res.page_info.next_cursor ?? undefined;
  }

  // Group by tissue → unique cell lines
  const groups = new Map<
    string,
    { total: Set<string>; essential: Set<string> }
  >();
  for (const r of allRows) {
    const tissue = r.tissue
      ? inferTissueGroup(r.tissue.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
      : "Other";
    const lineKey = r.cell_line ?? r.dataset_id;
    let g = groups.get(tissue);
    if (!g) {
      g = { total: new Set(), essential: new Set() };
      groups.set(tissue, g);
    }
    g.total.add(lineKey);
    if (r.is_significant) g.essential.add(lineKey);
  }

  return [...groups.entries()]
    .map(([tissue, g]) => ({
      tissue_name: tissue,
      max_value: g.essential.size / Math.max(g.total.size, 1),
      count: g.total.size,
      significant: g.essential.size,
      total_lines: g.total.size,
      essential_lines: g.essential.size,
      essential_fraction: g.essential.size / Math.max(g.total.size, 1),
    }))
    .sort((a, b) => b.essential_fraction - a.essential_fraction);
}
