import {
  fetchVariantScan,
  nextSearchParamsToUrlSearchParams,
  parseVariantScanFiltersFromUrl,
} from "@features/gene/api/variant-scan";
import { VariantExplorerTable } from "@features/gene/components/variant-explorer-table";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface VariantExplorerPageProps {
  params: Promise<{ loc: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VariantExplorerPage({
  params,
  searchParams,
}: VariantExplorerPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();
  const resolvedSearchParams = await searchParams;

  const filters = parseVariantScanFiltersFromUrl(
    nextSearchParamsToUrlSearchParams(resolvedSearchParams),
  );
  const pageSize = filters.limit ?? 20;

  const result = await fetchVariantScan(region.loc, {
    ...filters,
    scope: "region",
  });

  return (
    <VariantExplorerTable
      gene={region.loc}
      region={region.loc}
      initialData={result.data}
      initialPaginationInfo={{
        pageSize,
        totalCount: result.pageInfo?.total_count,
        hasMore: result.pageInfo?.has_more ?? false,
        currentCursor: result.pageInfo?.next_cursor ?? null,
      }}
    />
  );
}
