"use client";

import type { Variant } from "@features/variant/types";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable } from "@shared/hooks";
import { useEffect } from "react";
import { variantExplorerColumns } from "../config/hg38/columns/variant-explorer";
import { useVariantScanQuery } from "../hooks/use-variant-scan-query";

// ============================================================================
// Filter Configuration
// ============================================================================
//
// Filter `id`s are intentionally identical to the API field names so the
// URL parser in use-variant-scan-query.ts can roundtrip them automatically.
// Adding a filter only requires:
//   1. The field on VariantScanFilterOptions (variant-scan.ts)
//   2. ARRAY_FIELDS / NUMERIC_FIELDS entry (use-variant-scan-query.ts)
//   3. A row here.

const REGION_TYPE_OPTIONS = [
  { value: "exonic", label: "Exonic" },
  { value: "intronic", label: "Intronic" },
  { value: "splicing", label: "Splicing" },
  { value: "exonic;splicing", label: "Exonic/Splicing" },
  { value: "UTR3", label: "3' UTR" },
  { value: "UTR5", label: "5' UTR" },
  { value: "UTR5;UTR3", label: "5'/3' UTR" },
  { value: "upstream", label: "Upstream" },
  { value: "downstream", label: "Downstream" },
  { value: "upstream;downstream", label: "Up/Downstream" },
  { value: "intergenic", label: "Intergenic" },
  { value: "ncRNA_exonic", label: "ncRNA Exonic" },
  { value: "ncRNA_intronic", label: "ncRNA Intronic" },
  { value: "ncRNA_splicing", label: "ncRNA Splicing" },
  { value: "ncRNA_exonic;splicing", label: "ncRNA Exonic/Splicing" },
];

const CONSEQUENCE_OPTIONS = [
  { value: "nonsynonymous SNV", label: "Missense" },
  { value: "synonymous SNV", label: "Synonymous" },
  { value: "stopgain", label: "Stopgain" },
  { value: "stoploss", label: "Stoploss" },
  { value: "frameshift deletion", label: "Frameshift Deletion" },
  { value: "frameshift insertion", label: "Frameshift Insertion" },
  { value: "frameshift substitution", label: "Frameshift Substitution" },
  { value: "nonframeshift deletion", label: "Inframe Deletion" },
  { value: "nonframeshift insertion", label: "Inframe Insertion" },
  { value: "nonframeshift substitution", label: "Inframe Substitution" },
  { value: "unknown", label: "Unknown" },
];

const VARIANT_FILTERS: ServerFilterConfig[] = [
  // ─── Class ────────────────────────────────────────────────
  {
    id: "variant_class",
    section: "Class",
    label: "Variant Class",
    type: "multiselect",
    options: [
      { value: "snv", label: "SNV" },
      { value: "indel", label: "Indel" },
      { value: "mnv", label: "MNV" },
    ],
  },

  // ─── Functional Class ─────────────────────────────────────
  {
    id: "gencode_region_type",
    section: "Functional Class",
    label: "Gencode Region",
    type: "multiselect",
    options: REGION_TYPE_OPTIONS,
  },
  {
    id: "gencode_consequence",
    section: "Functional Class",
    label: "Gencode Consequence",
    type: "multiselect",
    options: CONSEQUENCE_OPTIONS,
  },
  {
    id: "refseq_region_type",
    section: "Functional Class",
    label: "RefSeq Region",
    type: "multiselect",
    options: REGION_TYPE_OPTIONS.filter((o) => o.value !== "ncRNA_UTR5"),
  },
  {
    id: "refseq_consequence",
    section: "Functional Class",
    label: "RefSeq Consequence",
    type: "multiselect",
    options: [
      { value: "nonsynonymous SNV", label: "Missense" },
      { value: "synonymous SNV", label: "Synonymous" },
      { value: "stopgain", label: "Stopgain" },
      { value: "stoploss", label: "Stoploss" },
      { value: "unknown", label: "Unknown" },
    ],
  },

  // ─── Frequency ────────────────────────────────────────────
  {
    id: "gnomad_genome_af_min",
    section: "Frequency",
    label: "gnomAD Genome AF ≥",
    type: "text",
    placeholder: "0.001",
  },
  {
    id: "gnomad_genome_af_max",
    section: "Frequency",
    label: "gnomAD Genome AF ≤",
    type: "text",
    placeholder: "0.05",
  },
  {
    id: "gnomad_exome_af_min",
    section: "Frequency",
    label: "gnomAD Exome AF ≥",
    type: "text",
    placeholder: "0.001",
  },
  {
    id: "gnomad_exome_af_max",
    section: "Frequency",
    label: "gnomAD Exome AF ≤",
    type: "text",
    placeholder: "0.05",
  },
  {
    id: "bravo_af_min",
    section: "Frequency",
    label: "TOPMed Bravo AF ≥",
    type: "text",
    placeholder: "0.001",
  },
  {
    id: "bravo_af_max",
    section: "Frequency",
    label: "TOPMed Bravo AF ≤",
    type: "text",
    placeholder: "0.05",
  },

  // ─── Predictions ──────────────────────────────────────────
  {
    id: "cadd_phred_min",
    section: "Predictions",
    label: "CADD Phred ≥",
    type: "text",
    placeholder: "20",
  },
  {
    id: "alphamissense_max_min",
    section: "Predictions",
    label: "AlphaMissense ≥",
    type: "text",
    placeholder: "0.564",
  },
  {
    id: "alphamissense_class",
    section: "Predictions",
    label: "AlphaMissense Class",
    type: "multiselect",
    options: [
      { value: "likely_pathogenic", label: "Likely Pathogenic" },
      { value: "ambiguous", label: "Ambiguous" },
      { value: "likely_benign", label: "Likely Benign" },
    ],
  },
  {
    id: "sift_cat",
    section: "Predictions",
    label: "SIFT",
    type: "multiselect",
    options: [
      { value: "deleterious", label: "Deleterious" },
      { value: "tolerated", label: "Tolerated" },
    ],
  },
  {
    id: "polyphen_cat",
    section: "Predictions",
    label: "PolyPhen",
    type: "multiselect",
    options: [
      { value: "probably_damaging", label: "Probably Damaging" },
      { value: "possibly_damaging", label: "Possibly Damaging" },
      { value: "benign", label: "Benign" },
      { value: "unknown", label: "Unknown" },
    ],
  },
  {
    id: "dbnsfp_metasvm_pred",
    section: "Predictions",
    label: "MetaSVM",
    type: "multiselect",
    options: [
      { value: "D", label: "Deleterious" },
      { value: "T", label: "Tolerated" },
    ],
  },
  {
    id: "aloft_description",
    section: "Predictions",
    label: "ALoFT",
    type: "multiselect",
    options: [
      { value: "Dominant", label: "Dominant" },
      { value: "Recessive", label: "Recessive" },
      { value: "Tolerant", label: "Tolerant" },
    ],
  },
  {
    id: "funseq_description",
    section: "Predictions",
    label: "FunSeq",
    type: "multiselect",
    options: [
      { value: "coding", label: "Coding" },
      { value: "noncoding", label: "Noncoding" },
    ],
  },
  {
    id: "revel_max_genome_min",
    section: "Predictions",
    label: "REVEL (genome) ≥",
    type: "text",
    placeholder: "0.5",
  },
  {
    id: "spliceai_max_genome_min",
    section: "Predictions",
    label: "SpliceAI ≥",
    type: "text",
    placeholder: "0.2",
  },
  {
    id: "pangolin_max_genome_min",
    section: "Predictions",
    label: "Pangolin ≥",
    type: "text",
    placeholder: "0.2",
  },

  // ─── Conservation ─────────────────────────────────────────
  {
    id: "linsight_min",
    section: "Conservation",
    label: "LINSIGHT ≥",
    type: "text",
    placeholder: "0.4",
  },
  {
    id: "fathmm_xf_min",
    section: "Conservation",
    label: "FATHMM-XF ≥",
    type: "text",
    placeholder: "0.5",
  },
  {
    id: "apc_conservation_min",
    section: "Conservation",
    label: "aPC Conservation ≥",
    type: "text",
    placeholder: "10",
  },
  {
    id: "phylop_min",
    section: "Conservation",
    label: "PhyloP ≥",
    type: "text",
    placeholder: "2",
  },

  // ─── Clinical ─────────────────────────────────────────────
  {
    id: "clinvar_clnsig",
    section: "Clinical",
    label: "ClinVar Significance",
    type: "multiselect",
    options: [
      { value: "Pathogenic", label: "Pathogenic" },
      { value: "Likely_pathogenic", label: "Likely Pathogenic" },
      { value: "Pathogenic/Likely_pathogenic", label: "Path/Likely Path" },
      { value: "Uncertain_significance", label: "Uncertain" },
      { value: "Conflicting_classifications_of_pathogenicity", label: "Conflicting" },
      { value: "Likely_benign", label: "Likely Benign" },
      { value: "Benign", label: "Benign" },
      { value: "Benign/Likely_benign", label: "Benign/Likely Benign" },
      { value: "drug_response", label: "Drug Response" },
      { value: "risk_factor", label: "Risk Factor" },
      { value: "protective", label: "Protective" },
      { value: "association", label: "Association" },
      { value: "not_provided", label: "Not Provided" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "clinvar_review_status",
    section: "Clinical",
    label: "Review Status",
    type: "multiselect",
    options: [
      { value: "practice_guideline", label: "Practice Guideline (4★)" },
      { value: "reviewed_by_expert_panel", label: "Expert Panel (3★)" },
      { value: "criteria_provided,_multiple_submitters,_no_conflicts", label: "Multi Submitter (2★)" },
      { value: "criteria_provided,_single_submitter", label: "Single Submitter (1★)" },
      { value: "criteria_provided,_conflicting_classifications", label: "Conflicting (1★)" },
      { value: "no_assertion_criteria_provided", label: "No Criteria (0★)" },
      { value: "no_classification_provided", label: "No Classification" },
    ],
  },
  {
    id: "clinvar_origin",
    section: "Clinical",
    label: "Origin",
    type: "multiselect",
    options: [
      { value: "germline", label: "Germline" },
      { value: "somatic", label: "Somatic" },
      { value: "de-novo", label: "De Novo" },
      { value: "inherited", label: "Inherited" },
      { value: "maternal", label: "Maternal" },
      { value: "paternal", label: "Paternal" },
      { value: "biparental", label: "Biparental" },
      { value: "uniparental", label: "Uniparental" },
      { value: "unknown", label: "Unknown" },
    ],
  },

  // ─── COSMIC ───────────────────────────────────────────────
  {
    id: "cosmic_tier",
    section: "COSMIC",
    label: "Tier",
    type: "multiselect",
    options: [
      { value: "1", label: "Tier 1" },
      { value: "2", label: "Tier 2" },
    ],
  },
  {
    id: "cosmic_is_canonical",
    section: "COSMIC",
    label: "Canonical",
    type: "multiselect",
    options: [
      { value: "y", label: "Yes" },
      { value: "n", label: "No" },
    ],
  },
  {
    id: "cosmic_so_term",
    section: "COSMIC",
    label: "SO Term",
    type: "multiselect",
    options: [
      { value: "SNV", label: "SNV" },
      { value: "deletion", label: "Deletion" },
      { value: "insertion", label: "Insertion" },
      { value: "indel", label: "Indel" },
    ],
  },
];

// ============================================================================
// Header subtitle
// ============================================================================

const REGION_LOC_RE = /^(?:chr)?([0-9XYM]+)-(\d+)-(\d+)$/i;

/**
 * Format the table subtitle. Detects region locs (`19-44808820-44908922`) and
 * renders them as `chr19:44,808,820–44,908,922 · 100 kb`. Gene symbols pass
 * through. Variant count is prepended when known.
 */
function buildSubtitle(target: string, totalCount?: number): string {
  const match = REGION_LOC_RE.exec(target);
  let label = target;

  if (match) {
    const [, chrom, startStr, endStr] = match;
    const start = Number(startStr);
    const end = Number(endStr);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      const fmt = (n: number) => n.toLocaleString();
      const size = end - start;
      const sizeLabel =
        size >= 1_000_000
          ? `${(size / 1_000_000).toFixed(2)} Mb`
          : size >= 1_000
            ? `${(size / 1_000).toFixed(size >= 10_000 ? 0 : 1)} kb`
            : `${size} bp`;
      label = `chr${chrom}:${fmt(start)}–${fmt(end)} · ${sizeLabel}`;
    }
  }

  if (totalCount !== undefined) {
    return `${totalCount.toLocaleString()} variants · ${label}`;
  }
  return label;
}

// ============================================================================
// Component
// ============================================================================

interface VariantExplorerTableProps {
  gene: string;
  /** When set, uses ?region= instead of ?gene= for the variant scan API */
  region?: string;
  initialData?: Variant[];
  initialPaginationInfo?: ServerPaginationInfo;
}

export function VariantExplorerTable({
  gene,
  region,
  initialData = [],
  initialPaginationInfo,
}: VariantExplorerTableProps) {
  const {
    data: queryData,
    pageInfo,
    isLoading,
    isFetching,
    prefetchNext,
  } = useVariantScanQuery({
    gene,
    region,
    initialData: initialData.length > 0
      ? {
          data: initialData,
          hasMore: initialPaginationInfo?.hasMore ?? false,
          nextCursor: initialPaginationInfo?.currentCursor ?? null,
          totalCount: initialPaginationInfo?.totalCount,
        }
      : undefined,
  });

  const data = queryData.length > 0 ? queryData : initialData;

  const paginationInfo: ServerPaginationInfo = {
    totalCount: pageInfo.totalCount,
    pageSize: initialPaginationInfo?.pageSize ?? 20,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters: VARIANT_FILTERS,
    debounceDelay: 400,
    serverPagination: true,
    paginationInfo,
  });

  // Prefetch next page
  useEffect(() => {
    if (pageInfo.hasMore && !isFetching) {
      prefetchNext();
    }
  }, [pageInfo.hasMore, isFetching, prefetchNext]);

  return (
    <DataSurface
      data={data}
      columns={variantExplorerColumns}
      title="Variant Explorer"
      subtitle={buildSubtitle(gene, pageInfo.totalCount)}
      searchPlaceholder="Search variants..."
      searchColumn="variant_vcf"
      exportable
      exportFilename={`variants-${gene}`}
      filterable
      filters={VARIANT_FILTERS}
      filterValues={tableState.filterValues}
      onFilterChange={tableState.onFilterChange}
      filterChips={tableState.filterChips}
      onRemoveFilterChip={tableState.onRemoveFilterChip}
      onClearFilters={tableState.onClearFilters}
      loading={isLoading}
      transitioning={isFetching && !isLoading}
      serverPagination={tableState.pagination}
      serverSort={tableState.serverSort}
      emptyMessage="No variants found matching the current filters"
    />
  );
}
