import type { GwasFilterOptions } from "@features/variant/api/gwas";
import { fetchGwasAssociations } from "@features/variant/api/gwas";
import { GwasCatalogTable } from "@features/variant/components/gwas-catalog-table";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

interface GwasCatalogPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  searchParams: Promise<{
    significance?: string;
    trait?: string;
    study?: string;
    pubmed?: string;
    cursor?: string;
    page_size?: string;
  }>;
}

/**
 * Map URL search params to API filter options
 */
function parseFilters(
  searchParams: Awaited<GwasCatalogPageProps["searchParams"]>,
): GwasFilterOptions {
  const pageSize = searchParams.page_size ? Number(searchParams.page_size) : 20;
  const filters: GwasFilterOptions = { limit: pageSize };

  // Add cursor if present (for pagination)
  if (searchParams.cursor) {
    filters.cursor = searchParams.cursor;
  }

  // Significance level -> pvalue_mlog_min
  if (searchParams.significance === "genome-wide") {
    filters.pvalueMlogMin = 7.3; // -log10(5e-8)
  } else if (searchParams.significance === "suggestive") {
    filters.pvalueMlogMin = 5; // -log10(1e-5)
  } else if (searchParams.significance === "nominal") {
    filters.pvalueMlogMin = 1.3; // -log10(0.05)
  }

  // Direct mappings
  if (searchParams.trait) {
    filters.traitContains = searchParams.trait;
  }
  if (searchParams.study) {
    filters.studyAccession = searchParams.study;
  }
  if (searchParams.pubmed) {
    filters.pubmedId = searchParams.pubmed;
  }

  return filters;
}

export default async function GwasCatalogPage({
  params,
  searchParams,
}: GwasCatalogPageProps) {
  const [{ vcf }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const variantVcf = result.selected.variant_vcf;
  const filters = parseFilters(resolvedSearchParams);
  const { data, meta, pageInfo } = await fetchGwasAssociations(
    variantVcf,
    filters,
  );

  // Pass current filter values to client for UI state
  const currentFilters = {
    significance: resolvedSearchParams.significance ?? "",
    trait: resolvedSearchParams.trait ?? "",
    study: resolvedSearchParams.study ?? "",
    pubmed: resolvedSearchParams.pubmed ?? "",
  };

  // Get page size from URL or use default
  const pageSize = resolvedSearchParams.page_size
    ? Number(resolvedSearchParams.page_size)
    : 10;

  return (
    <GwasCatalogTable
      data={data}
      meta={meta}
      variantVcf={variantVcf}
      serverFilters={currentFilters}
      paginationInfo={{
        totalCount: pageInfo?.total_count,
        pageSize,
        hasMore: pageInfo?.has_more ?? false,
        currentCursor: pageInfo?.next_cursor ?? null,
      }}
    />
  );
}
