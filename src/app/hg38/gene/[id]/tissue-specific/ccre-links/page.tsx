import {
  fetchCcreLinks,
  fetchCcreLinksByTissueGroup,
} from "@features/enrichment/api/region";
import { CcreLinksView } from "@features/enrichment/components/ccre-links-view";
import { fetchGene } from "@features/gene/api";
import { notFound } from "next/navigation";

interface CcreLinksPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function CcreLinksPage({
  params,
  searchParams,
}: CcreLinksPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const symbol = gene.gene_symbol || id;

  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchCcreLinksByTissueGroup(symbol).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchCcreLinks(symbol, { tissue_group: tissueGroup, limit: 50 }).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  return (
    <CcreLinksView
      gene={symbol}
      totalCount={
        initialData?.page_info?.total_count ??
        initialData?.page_info?.count ??
        0
      }
      initialData={initialData ?? undefined}
      groupedData={groupedData}
    />
  );
}
