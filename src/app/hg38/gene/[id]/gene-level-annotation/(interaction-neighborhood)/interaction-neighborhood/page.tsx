import { fetchGene, fetchSubgraph } from "@features/gene/api";
import { PPINetworkView } from "@features/gene/components/ppi-network";
import { notFound } from "next/navigation";

interface InteractionNeighborhoodPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InteractionNeighborhoodPage({
  params,
}: InteractionNeighborhoodPageProps) {
  const { id } = await params;

  // Fetch basic gene info and subgraph data in parallel
  const [geneResponse, subgraphResponse] = await Promise.all([
    fetchGene(id),
    fetchSubgraph({
      seeds: [{ type: "Gene", id }],
      maxDepth: 2,
      edgeTypes: ["INTERACTS_WITH"],
      nodeLimit: 200,
      edgeLimit: 400,
      includeProps: true,
    }),
  ]);

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const geneId = gene.gene_id_versioned?.split(".")[0] || id;
  const geneSymbol = gene.gene_symbol ?? geneId;

  // Use subgraph data if available, otherwise fall back to legacy format
  const subgraphData = subgraphResponse?.data?.graph;

  return (
    <PPINetworkView
      seedGeneId={geneId}
      seedGeneSymbol={geneSymbol}
      subgraphNodes={subgraphData?.nodes}
      subgraphEdges={subgraphData?.edges}
    />
  );
}
