import { fetchGene } from "@features/gene/api";
import { SomaticAlterationsOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface SomaticAlterationsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SomaticAlterationsPage({
  params,
}: SomaticAlterationsPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id, {
    include: "counts,edges",
    edgeTypes: "GENE_ALTERED_IN_DISEASE",
    direction: "out",
    limitPerEdgeType: 500,
    sort: JSON.stringify({ GENE_ALTERED_IN_DISEASE: "-alteration_frequency" }),
    neighborMode: "GENE_ALTERED_IN_DISEASE=summary",
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

  return (
    <SomaticAlterationsOverview
      relations={relations}
      edges={edges}
      geneSymbol={gene.gene_symbol}
    />
  );
}
