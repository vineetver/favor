import { fetchGene } from "@features/gene/api";
import { DiseasePortfolioOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface DiseasePortfolioPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DiseasePortfolioPage({
  params,
}: DiseasePortfolioPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id, {
    include: "counts,edges",
    edgeTypes: "ASSOCIATED_WITH_DISEASE",
    direction: "out",
    limitPerEdgeType: 500,
    sort: JSON.stringify({ ASSOCIATED_WITH_DISEASE: "-overall_score" }),
    neighborMode: "ASSOCIATED_WITH_DISEASE=full",
  });

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const relations =
    geneResponse?.relations ??
    geneResponse?.included?.relations ??
    undefined;
  const edges = geneResponse?.edges;
  const geneId = gene.gene_id_versioned?.split(".")[0] || id;

  return (
    <DiseasePortfolioOverview
      relations={relations}
      edges={edges}
      geneId={geneId}
      geneSymbol={gene.gene_symbol}
    />
  );
}
