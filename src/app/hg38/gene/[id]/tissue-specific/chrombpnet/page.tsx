import { fetchGene } from "@features/gene/api";
import {
  fetchChromBpnet,
  fetchChromBpnetByTissueGroup,
} from "@features/enrichment/api/region";
import { ChromBpnetView } from "@features/enrichment/components/chrombpnet-view";
import { notFound } from "next/navigation";

interface ChromBpnetPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function ChromBpnetPage({
  params,
  searchParams,
}: ChromBpnetPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchChromBpnetByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchChromBpnet(loc, { tissue_group: tissueGroup, limit: 25 }).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  return (
    <ChromBpnetView
      loc={loc}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
      groupedData={groupedData}
    />
  );
}
