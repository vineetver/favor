import { fetchGene } from "@features/gene/api";
import {
  fetchVariantScan,
  nextSearchParamsToUrlSearchParams,
  parseVariantScanFiltersFromUrl,
} from "@features/gene/api/variant-scan";
import { VariantExplorerTable } from "@features/gene/components/variant-explorer-table";
import { notFound } from "next/navigation";

interface VariantExplorerPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VariantExplorerPage({
  params,
  searchParams,
}: VariantExplorerPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const geneSymbol = gene.gene_symbol || id;

  const filters = parseVariantScanFiltersFromUrl(
    nextSearchParamsToUrlSearchParams(resolvedSearchParams),
  );
  const pageSize = filters.limit ?? 20;

  const result = await fetchVariantScan(geneSymbol, filters);

  return (
    <VariantExplorerTable
      gene={geneSymbol}
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
