import { fetchGene } from "@features/gene/api";
import { fetchQtls, fetchQtlsByTissueGroup } from "@features/enrichment/api/region";
import { QtlsView } from "@features/enrichment/components/qtls-view";
import { notFound } from "next/navigation";

interface QtlsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function QtlsPage({ params, searchParams }: QtlsPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchQtlsByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchQtls(loc, { tissue_group: tissueGroup, limit: 25 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Extract unique genes from initial data for filter dropdown
  const genes = initialData
    ? [...new Set(initialData.data.map((r) => r.gene_symbol).filter(Boolean) as string[])].sort()
    : [];

  return (
    <QtlsView
      loc={loc}
      totalCount={initialData?.page_info?.total_count ?? 0}
      genes={genes}
      initialData={initialData ?? undefined}
      groupedData={groupedData}
    />
  );
}
