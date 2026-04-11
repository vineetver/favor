import { fetchGene } from "@features/gene/api";
import { DrugLandscapeOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface DrugLandscapePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DrugLandscapePage({
  params,
}: DrugLandscapePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id, {
    include: "counts,edges",
    edgeTypes: "DRUG_ACTS_ON_GENE,DRUG_DISPOSITION_BY_GENE",
    direction: "in",
    limitPerEdgeType: 500,
    sort: JSON.stringify({
      DRUG_ACTS_ON_GENE: "-max_clinical_phase",
      DRUG_DISPOSITION_BY_GENE: "-evidence_count",
    }),
    neighborMode: "DRUG_ACTS_ON_GENE=summary,DRUG_DISPOSITION_BY_GENE=summary",
  });

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const relations =
    geneResponse?.relations ?? geneResponse?.included?.relations ?? undefined;
  const edges = geneResponse?.edges;

  return (
    <DrugLandscapeOverview
      relations={relations}
      edges={edges}
      geneSymbol={gene.gene_symbol}
    />
  );
}
