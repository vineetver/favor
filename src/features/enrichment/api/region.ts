import { fetchJson, fetchOrNull } from "@infra/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Shared pagination types
// ---------------------------------------------------------------------------

export interface PageInfo {
  next_cursor: string | null;
  count: number;
  has_more: boolean;
  total_count?: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  page_info: PageInfo;
}

export interface FacetsResponse {
  facets: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Region summary
// ---------------------------------------------------------------------------

export interface RegionSummary {
  region: string;
  counts: {
    signals: number;
    chromatin_states: number;
    enhancer_genes: number;
    epiraction: number;
    epimap: number;
    encode_re2g: number;
    accessibility_peaks: number;
    loops: number;
    ase: number;
    validated_enhancers: number;
    qtls: number;
    tissue_scores: number;
    chrombpnet: number;
    allelic_imbalance: number;
    methylation: number;
    pgs: number;
    genotypes: number;
    crispr_screens?: number;
    perturb_seq?: number;
    mave_scores?: number;
  };
}

export async function fetchRegionSummary(
  loc: string,
): Promise<RegionSummary | null> {
  return fetchOrNull<RegionSummary>(
    `${API_BASE}/regions/${encodeURIComponent(loc)}`,
  );
}

// ---------------------------------------------------------------------------
// Tissue-level aggregation (group_by=tissue_group for cross-table consistency)
// ---------------------------------------------------------------------------

export interface TissueGroupRow {
  tissue_name: string;
  max_value: number;
  count: number;
  significant?: number;
  top_item?: string;
}

/** API returns `group_key` — map to our `tissue_name` field */
interface RawGroupRow {
  group_key: string;
  max_value: number;
  count: number;
  significant?: number;
  top_item?: string;
}

function mapGroupRows(raw: RawGroupRow[]): TissueGroupRow[] {
  return raw.map((r) => ({
    tissue_name: r.group_key,
    max_value: r.max_value,
    count: r.count,
    significant: r.significant,
    top_item: r.top_item,
  }));
}

async function fetchGrouped(url: string): Promise<TissueGroupRow[]> {
  const res = await fetchJson<{ data: RawGroupRow[] }>(url);
  return mapGroupRows(res.data);
}

export async function fetchSignalsByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/signals?group_by=tissue_group`);
}

export async function fetchEnhancersByTissueGroup(
  loc: string,
  opts: { method?: string; target_gene?: string } = {},
): Promise<TissueGroupRow[]> {
  const params = new URLSearchParams({ group_by: "tissue_group" });
  if (opts.method) params.set("method", opts.method);
  if (opts.target_gene) params.set("target_gene", opts.target_gene);
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?${params}`);
}

export async function fetchAseByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/ase?group_by=tissue_group`);
}

export async function fetchChromatinByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states?group_by=tissue_group`);
}

export async function fetchAccessibilityByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/accessibility?group_by=tissue_group`);
}

export async function fetchLoopsByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/regions/${encodeURIComponent(loc)}/loops?group_by=tissue_group`);
}

export async function fetchQtlsByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/variants/${encodeURIComponent(loc)}/qtls?group_by=tissue_group`);
}

export async function fetchChromBpnetByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/variants/${encodeURIComponent(loc)}/chrombpnet?group_by=tissue_group`);
}

export async function fetchVariantAllelicImbalanceByTissueGroup(loc: string): Promise<TissueGroupRow[]> {
  return fetchGrouped(`${API_BASE}/variants/${encodeURIComponent(loc)}/allelic-imbalance?group_by=tissue_group`);
}

// ---------------------------------------------------------------------------
// Region Variants (variant-regulatory connections)
// ---------------------------------------------------------------------------

export interface RegionVariantRow {
  vid: number;
  chrom_id: number;
  position: number;
  variant_vcf: string;
  region_table: string;
  region_id: string;
}

export async function fetchRegionVariants(
  loc: string,
  params: { region_table?: string; cursor?: string; limit?: number } = {},
): Promise<PaginatedResponse<RegionVariantRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/variants${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<RegionVariantRow>>(url);
}

// ---------------------------------------------------------------------------
// Variant Evidence Summary (ranked by total evidence across all data types)
// ---------------------------------------------------------------------------

export interface VariantEvidenceSummaryRow {
  vid: number;
  variant_vcf: string;
  position: number;
  region_tables: string[];
  region_overlap_count: number;
  qtl_count: number;
  qtl_significant: number;
  chrombpnet_count: number;
  tissue_score_max: number;
  imbalance_count: number;
  imbalance_significant: number;
  methylation_count: number;
  pgs_count: number;
}

export async function fetchVariantEvidenceSummary(
  loc: string,
  limit = 50,
): Promise<VariantEvidenceSummaryRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/variant-evidence-summary?limit=${limit}`;
  const res = await fetchJson<{ data: VariantEvidenceSummaryRow[] }>(url);
  return res.data;
}

// ---------------------------------------------------------------------------
// Target Gene Evidence (variant → which genes does it regulate?)
// ---------------------------------------------------------------------------

export interface SourceEvidence {
  source: string;
  label: string;
  category: string;
  associations: number;
  significant: number;
  tissues: number;
  best_neglog_p?: number;
  best_score?: number;
}

export interface TissueEvidence {
  tissue: string;
  sources: string[];
  best_neglog_p?: number;
  best_score?: number;
  significant: boolean;
}

export interface TargetGeneEvidence {
  gene_symbol: string;
  evidence_count: number;
  significant_count: number;
  tissue_count: number;
  max_neglog_p?: number;
  max_score?: number;
  sources: SourceEvidence[];
  top_tissues: TissueEvidence[];
  crispr_total?: number;
  crispr_significant?: number;
  perturb_seq_downstream_genes?: number;
  perturb_seq_top_genes?: string[];
}

export async function fetchTargetGenes(
  ref: string,
  limit = 50,
): Promise<TargetGeneEvidence[]> {
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/target-genes?limit=${limit}`;
  const res = await fetchJson<{ data: TargetGeneEvidence[] }>(url);
  return res.data;
}

// ---------------------------------------------------------------------------
// Tissue Signals
// ---------------------------------------------------------------------------

export interface SignalRow {
  ccre_id: string;
  start: number;
  end: number;
  tissue_name: string;
  tissue_group?: string;
  subtissue_name?: string;
  dnase: number | null;
  atac: number | null;
  ctcf: number | null;
  h3k27ac: number | null;
  h3k4me3: number | null;
  has_dnase?: boolean;
  has_atac?: boolean;
  has_ctcf?: boolean;
  has_h3k27ac?: boolean;
  has_h3k4me3?: boolean;
  max_signal: number;
  ccre_classification: string;
}

export interface FetchSignalsParams {
  tissue?: string;
  tissue_group?: string;
  ccre_class?: string;
  min_signal?: number;
  facets?: "tissue_name" | "ccre_classification";
  sort_by?: "position" | "max_signal" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

function buildParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

export async function fetchSignals(
  loc: string,
  params: FetchSignalsParams = {},
): Promise<PaginatedResponse<SignalRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/signals${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<SignalRow>>(url);
}

export async function fetchSignalFacets(
  loc: string,
  facet: "tissue_name" | "ccre_classification",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/signals?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}

// ---------------------------------------------------------------------------
// Chromatin States
// ---------------------------------------------------------------------------

export interface ChromatinStateRow {
  start: number;
  end: number;
  tissue_name: string;
  tissue_group?: string;
  state_code: string;
  state_name: string;
  state_category: string;
  state_color: string;
}

export interface FetchChromatinStatesParams {
  tissue?: string;
  tissue_group?: string;
  state_category?: string;
  facets?: "tissue_name" | "state_category" | "state_code";
  sort_by?: "position" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchChromatinStates(
  loc: string,
  params: FetchChromatinStatesParams = {},
): Promise<PaginatedResponse<ChromatinStateRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<ChromatinStateRow>>(url);
}

export async function fetchChromatinStateFacets(
  loc: string,
  facet: "tissue_name" | "state_category" | "state_code",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}

// ---------------------------------------------------------------------------
// Enhancer-Gene Predictions
// ---------------------------------------------------------------------------

export interface EnhancerGeneRow {
  method: "abc" | "epiraction" | "epimap" | "re2g";
  start: number;
  end: number;
  gene_symbol: string | null;
  tissue_name: string;
  tissue_group?: string;
  score: number | null;
  distance: number | null;
  detail: Record<string, unknown> | null;
}

export interface FetchEnhancerGenesParams {
  tissue?: string;
  tissue_group?: string;
  method?: "abc" | "epiraction" | "epimap" | "re2g";
  target_gene?: string;
  min_score?: number;
  facets?: "tissue_name" | "gene_symbol" | "method";
  sort_by?: "position" | "score" | "distance";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchEnhancerGenes(
  loc: string,
  params: FetchEnhancerGenesParams = {},
): Promise<PaginatedResponse<EnhancerGeneRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<EnhancerGeneRow>>(url);
}

export async function fetchEnhancerGeneFacets(
  loc: string,
  facet: "tissue_name" | "gene_symbol" | "method",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}

// ---------------------------------------------------------------------------
// Accessibility Peaks
// ---------------------------------------------------------------------------

export interface AccessibilityRow {
  start: number;
  end: number;
  peak_id: string;
  tissue_name: string;
  tissue_group?: string;
  signal_value: number;
}

export interface FetchAccessibilityParams {
  tissue?: string;
  tissue_group?: string;
  min_signal?: number;
  sort_by?: "position" | "max_signal" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchAccessibility(
  loc: string,
  params: FetchAccessibilityParams = {},
): Promise<PaginatedResponse<AccessibilityRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/accessibility${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<AccessibilityRow>>(url);
}

// ---------------------------------------------------------------------------
// Chromatin Loops
// ---------------------------------------------------------------------------

export interface LoopRow {
  anchor1_start: number;
  anchor1_end: number;
  anchor2_start: number;
  anchor2_end: number;
  loop_span: number;
  assay_type: string;
  tissue_name: string;
  tissue_group?: string;
}

export interface FetchLoopsParams {
  tissue?: string;
  tissue_group?: string;
  assay?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchLoops(
  loc: string,
  params: FetchLoopsParams = {},
): Promise<PaginatedResponse<LoopRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/loops${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<LoopRow>>(url);
}

// ---------------------------------------------------------------------------
// Allele-Specific Epigenomic Activity (ASE)
// ---------------------------------------------------------------------------

export interface AseRow {
  ccre_accession: string;
  start: number;
  end: number;
  tissue_name: string;
  tissue_group?: string;
  assay: string;
  neglog_pvalue: number;
  is_significant: boolean;
}

export interface FetchAseParams {
  tissue?: string;
  tissue_group?: string;
  significant_only?: boolean;
  assay?: string;
  sort_by?: "position" | "tissue_name" | "neglog_pvalue";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchAse(
  loc: string,
  params: FetchAseParams = {},
): Promise<PaginatedResponse<AseRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/ase${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<AseRow>>(url);
}

// ---------------------------------------------------------------------------
// Validated Enhancers (VISTA)
// ---------------------------------------------------------------------------

export interface ValidatedEnhancerRow {
  start: number;
  end: number;
  element_id: string;
  is_positive: boolean;
  tissues_raw: string;
}

export async function fetchValidatedEnhancers(
  loc: string,
  positiveOnly?: boolean,
): Promise<ValidatedEnhancerRow[]> {
  const params = positiveOnly ? "?positive_only=true" : "";
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/validated-enhancers${params}`;
  return fetchJson<ValidatedEnhancerRow[]>(url);
}

// ---------------------------------------------------------------------------
// cCRE-Gene Links (gene-keyed, not region-indexed)
// ---------------------------------------------------------------------------

export interface CcreLinkRow {
  ccre_id: string;
  gene_symbol: string;
  source: string;
  method: string;
  tissue_name: string;
  score: number | null;
  effect_size: number | null;
}

export interface FetchCcreLinksParams {
  source?: string;
  method?: string;
  tissue?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchCcreLinks(
  gene: string,
  params: FetchCcreLinksParams = {},
): Promise<PaginatedResponse<CcreLinkRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/genes/${encodeURIComponent(gene)}/ccre-links${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<CcreLinkRow>>(url);
}

// ---------------------------------------------------------------------------
// cCRE Gene Links (cCRE-keyed — unions chiapet, crispr, screen_v4, eqtl_ccre)
// ---------------------------------------------------------------------------

export interface CcreGeneLinkRow {
  gene_symbol: string;
  source: string;
  tissue_name: string;
  score: number | null;
  effect_size?: number | null;
  method: string;
}

export interface FetchCcreGeneLinksParams {
  source?: string;
  method?: string;
  tissue?: string;
  gene?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchCcreGeneLinks(
  ccreId: string,
  params: FetchCcreGeneLinksParams = {},
): Promise<PaginatedResponse<CcreGeneLinkRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/ccres/${encodeURIComponent(ccreId)}/gene-links${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<CcreGeneLinkRow>>(url);
}

// ---------------------------------------------------------------------------
// cCRE Detail (for slide-over panel)
// ---------------------------------------------------------------------------

export interface CcreSignal {
  tissue_name: string;
  max_signal: number;
  h3k27ac?: number;
  dnase?: number;
}

export interface CcreGeneLink {
  gene_symbol: string;
  source: string;
  method: string;
  tissue_name: string;
  score: number | null;
}

export interface CcreDetail {
  ccre_id: string;
  chrom: string;
  start: number;
  end: number;
  classifications: string[];
  signals: {
    total_tissues: number;
    top: CcreSignal[];
  };
  genes: {
    total: number;
    links: CcreGeneLink[];
  };
}

// ---------------------------------------------------------------------------
// Variant-level endpoints (accept gene symbol as {ref} for region queries)
// ---------------------------------------------------------------------------

// --- QTLs ---

export interface QtlRow {
  variant_vcf: string;
  position: number;
  source: string;
  gene_symbol: string | null;
  gene_id: string | null;
  tissue_name: string;
  tissue_group?: string;
  effect_size?: number | null;
  p_value?: number | null;
  neglog_pvalue?: number | null;
  is_significant: boolean;
  tss_distance?: number | null;
  source_fields?: Record<string, unknown> | null;
}

export interface FetchQtlsParams {
  tissue?: string;
  tissue_group?: string;
  source?: string;
  gene?: string;
  significant_only?: boolean;
  min_neglog_p?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchQtls(
  ref: string,
  params: FetchQtlsParams = {},
): Promise<PaginatedResponse<QtlRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/qtls${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<QtlRow>>(url);
}

// --- ChromBPNet ---

export interface ChromBpnetRow {
  variant_vcf: string;
  position: number;
  tissue_name: string;
  tissue_group?: string;
  combined_score: number;
  combined_pval: number;
  logfc_mean: number;
  jsd_mean?: number | null;
  peak_overlap?: boolean | null;
  closest_gene_1?: string | null;
  gene_distance_1?: number | null;
}

export interface FetchChromBpnetParams {
  tissue?: string;
  tissue_group?: string;
  min_score?: number;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchChromBpnet(
  ref: string,
  params: FetchChromBpnetParams = {},
): Promise<PaginatedResponse<ChromBpnetRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/chrombpnet${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<ChromBpnetRow>>(url);
}

// --- Tissue Scores (cV2F / TLand) ---

export interface TissueScoreRow {
  variant_vcf: string;
  position: number;
  tissue_name: string;
  tissue_group?: string;
  score: number;
  score_type: string;
}

export interface FetchTissueScoresParams {
  tissue?: string;
  score_type?: string;
  min_score?: number;
  cursor?: string;
  limit?: number;
}

export async function fetchTissueScores(
  ref: string,
  params: FetchTissueScoresParams = {},
): Promise<PaginatedResponse<TissueScoreRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/tissue-scores${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<TissueScoreRow>>(url);
}

// --- Variant Allelic Imbalance (ENTEx histone) ---

export interface VariantAllelicImbalanceRow {
  variant_vcf: string;
  position: number;
  tissue_name: string;
  tissue_group?: string;
  mark: string;
  assay_name: string;
  neglog_pvalue: number;
  imbalance_magnitude: number;
  is_significant: boolean;
  ref_allele_ratio?: number | null;
  alt_biased?: boolean | null;
  ref_biased?: boolean | null;
}

export interface FetchVariantAllelicImbalanceParams {
  tissue?: string;
  tissue_group?: string;
  mark?: string;
  assay?: string;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchVariantAllelicImbalance(
  ref: string,
  params: FetchVariantAllelicImbalanceParams = {},
): Promise<PaginatedResponse<VariantAllelicImbalanceRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/allelic-imbalance${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<VariantAllelicImbalanceRow>>(url);
}

// --- Methylation ---

export interface MethylationRow {
  variant_vcf: string;
  position: number;
  tissue_name: string;
  tissue_group?: string;
  neglog_pvalue: number;
  methylation_diff: number;
  is_significant: boolean;
  methylation_allele1?: number | null;
  methylation_allele2?: number | null;
  ref_hypermethylated?: boolean | null;
}

export interface FetchMethylationParams {
  tissue?: string;
  significant_only?: boolean;
  cursor?: string;
  limit?: number;
}

export async function fetchMethylation(
  ref: string,
  params: FetchMethylationParams = {},
): Promise<PaginatedResponse<MethylationRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/variants/${encodeURIComponent(ref)}/methylation${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<MethylationRow>>(url);
}

// ---------------------------------------------------------------------------
// cCRE Detail (for slide-over panel)
// ---------------------------------------------------------------------------

export async function fetchCcreDetail(
  ccreId: string,
  params?: { tissue?: string; signal_limit?: number; gene_limit?: number },
): Promise<CcreDetail> {
  const qs = params
    ? buildParams(params as unknown as Record<string, unknown>)
    : "";
  const url = `${API_BASE}/ccres/${encodeURIComponent(ccreId)}${qs ? `?${qs}` : ""}`;
  return fetchJson<CcreDetail>(url);
}
