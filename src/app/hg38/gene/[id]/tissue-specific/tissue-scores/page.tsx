import { fetchGene } from "@features/gene/api";
import { fetchTissueScores } from "@features/enrichment/api/region";
import { TissueScoresView } from "@features/enrichment/components/tissue-scores-view";
import { notFound } from "next/navigation";

interface TissueScoresPageProps {
  params: Promise<{ id: string }>;
}

export default async function TissueScoresPage({ params }: TissueScoresPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

  const initialData = await fetchTissueScores(loc, { sort_by: "score", sort_dir: "desc", limit: 25 }).catch(() => null);

  return (
    <TissueScoresView
      loc={loc}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
