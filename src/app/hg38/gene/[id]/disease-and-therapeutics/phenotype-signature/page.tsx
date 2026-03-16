import { fetchGene } from "@features/gene/api";
import { PhenotypeSignatureOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface PhenotypeSignaturePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PhenotypeSignaturePage({
  params,
}: PhenotypeSignaturePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id, {
    include: "counts,edges",
    edgeTypes: "GENE_ASSOCIATED_WITH_PHENOTYPE",
    direction: "out",
    limitPerEdgeType: 500,
    sort: JSON.stringify({ GENE_ASSOCIATED_WITH_PHENOTYPE: "-evidence_count" }),
    neighborMode: "GENE_ASSOCIATED_WITH_PHENOTYPE=summary",
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
    <PhenotypeSignatureOverview
      relations={relations}
      edges={edges}
      geneSymbol={gene.gene_symbol}
    />
  );
}
