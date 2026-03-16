import { fetchGene } from "@features/gene/api";
import {
  fetchEnhancerGeneFacets,
  fetchEnhancerGenes,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { EnhancerGenesView } from "@features/enrichment/components/enhancer-genes-view";
import { notFound } from "next/navigation";

interface EnhancerGenesPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnhancerGenesPage({
  params,
}: EnhancerGenesPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [geneFacets, tissueFacets, summary, initialData] = await Promise.all([
    fetchEnhancerGeneFacets(loc, "gene_symbol").catch(() => ({
      facets: [],
      count: 0,
    })),
    fetchEnhancerGeneFacets(loc, "tissue_name").catch(() => ({
      facets: [],
      count: 0,
    })),
    fetchRegionSummary(loc).catch(() => null),
    fetchEnhancerGenes(loc, {
      method: "abc",
      sort_by: "score",
      sort_dir: "desc",
      limit: 25,
    }).catch(() => null),
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
    />
  );
}
