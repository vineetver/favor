import { fetchGene } from "@features/gene/api";
import { PharmacogenomicsOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface PharmacogenomicsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PharmacogenomicsPage({
  params,
}: PharmacogenomicsPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id, {
    include: "counts,edges",
    edgeTypes: "GENE_AFFECTS_DRUG_RESPONSE",
    direction: "out",
    limitPerEdgeType: 500,
    sort: JSON.stringify({ GENE_AFFECTS_DRUG_RESPONSE: "-evidence_count" }),
    neighborMode: "GENE_AFFECTS_DRUG_RESPONSE=summary",
  });

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const relations =
    geneResponse?.relations ?? geneResponse?.included?.relations ?? undefined;
  const edges = geneResponse?.edges;

  return (
    <PharmacogenomicsOverview
      relations={relations}
      edges={edges}
      geneSymbol={gene.gene_symbol}
    />
  );
}
