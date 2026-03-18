import { fetchGene } from "@features/gene/api";
import {
  fetchEnhancerGeneFacets,
  fetchEnhancerGenes,
  fetchEnhancersByTissueGroup,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { EnhancerGenesView } from "@features/enrichment/components/enhancer-genes-view";
import { notFound } from "next/navigation";

interface EnhancerGenesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function EnhancerGenesPage({
  params,
  searchParams,
}: EnhancerGenesPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [groupedData, geneFacets, tissueFacets, summary, initialData] =
    await Promise.all([
      !tissueGroup
        ? fetchEnhancersByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchEnhancerGeneFacets(loc, "gene_symbol").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
      tissueGroup
        ? fetchEnhancerGeneFacets(loc, "tissue_name").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
      fetchRegionSummary(loc).catch(() => null),
      tissueGroup
        ? fetchEnhancerGenes(loc, {
            tissue_group: tissueGroup,
            method: "abc",
            sort_by: "score",
            sort_dir: "desc",
            limit: 25,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

  return (
    <EnhancerGenesView
      loc={loc}
      totalCount={summary?.counts.enhancer_genes ?? 0}
      genes={geneFacets.facets.filter(Boolean)}
      tissues={tissueFacets.facets.filter(Boolean)}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
      groupedData={groupedData}
    />
  );
}
