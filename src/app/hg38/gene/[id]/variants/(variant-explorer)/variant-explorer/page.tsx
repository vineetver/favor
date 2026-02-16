import { fetchGene } from "@features/gene/api";
import { fetchVariantScan } from "@features/gene/api/variant-scan";
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

  // Parse filter options from search params for initial server-side fetch
  const pageSize = Number(resolvedSearchParams.page_size) || 20;
  const cursor = resolvedSearchParams.cursor as string | undefined;

  const result = await fetchVariantScan(geneSymbol, {
    limit: pageSize,
    cursor,
    gencode_region_type: resolvedSearchParams.region_type
      ? [resolvedSearchParams.region_type as string]
      : undefined,
    gencode_consequence: resolvedSearchParams.consequence
      ? [resolvedSearchParams.consequence as string]
      : undefined,
    clinvar_clnsig: resolvedSearchParams.clinvar
      ? [resolvedSearchParams.clinvar as string]
      : undefined,
    sift_cat: resolvedSearchParams.sift
      ? [resolvedSearchParams.sift as string]
      : undefined,
    polyphen_cat: resolvedSearchParams.polyphen
      ? [resolvedSearchParams.polyphen as string]
      : undefined,
    alphamissense_class: resolvedSearchParams.alphamissense
      ? [resolvedSearchParams.alphamissense as string]
      : undefined,
    gnomad_genome_af_min: resolvedSearchParams.af_min
      ? Number(resolvedSearchParams.af_min)
      : undefined,
    gnomad_genome_af_max: resolvedSearchParams.af_max
      ? Number(resolvedSearchParams.af_max)
      : undefined,
    cadd_phred_min: resolvedSearchParams.cadd_min
      ? Number(resolvedSearchParams.cadd_min)
      : undefined,
  });

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
