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
    edgeTypes: "IMPLICATED_IN",
    direction: "out",
    limitPerEdgeType: 50,
    sort: JSON.stringify({ IMPLICATED_IN: "-score" }),
    neighborMode: "IMPLICATED_IN=summary",
  });

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  console.log("Gene Response:", geneResponse.relations);
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
