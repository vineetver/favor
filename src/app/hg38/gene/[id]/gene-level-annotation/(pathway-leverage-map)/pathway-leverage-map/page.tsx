import { fetchGene, fetchSubgraph } from "@features/gene/api";
import {
  type PathwayHierarchyEdge,
  PathwayLeverageView,
  type PathwayNode,
  parsePathwayFromNode,
} from "@features/gene/components/pathway-map";
import { notFound } from "next/navigation";

interface PathwayLeverageMapPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PathwayLeverageMapPage({
  params,
}: PathwayLeverageMapPageProps) {
  const { id } = await params;

  // Fetch gene data
  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const geneId = gene.gene_id_versioned?.split(".")[0] || id;
  const geneSymbol = gene.gene_symbol ?? geneId;

  // Get pathways from graph edges (single source of truth)
  const subgraphResponse = await fetchSubgraph({
    seeds: [{ type: "Gene", id: geneId }],
    maxDepth: 2,
    edgeTypes: ["PARTICIPATES_IN", "PART_OF"],
    nodeLimit: 200,
    edgeLimit: 400,
    includeProps: true,
  });

  const nodes = subgraphResponse?.data?.graph?.nodes ?? [];
  const edges = subgraphResponse?.data?.graph?.edges ?? [];

  // Extract pathways from PARTICIPATES_IN edges (Gene → Pathway)
  const participatingPathwayIds = new Set(
    edges
      .filter((e) => e.type === "PARTICIPATES_IN" && e.from.id === geneId)
      .map((e) => e.to.id),
  );

  // Get pathway nodes that the gene participates in
  const pathways: PathwayNode[] = nodes
    .filter((n) => n.type === "Pathway" && participatingPathwayIds.has(n.id))
    .map((n) => parsePathwayFromNode(n));

  // Extract hierarchy edges from PART_OF relationships
  const hierarchyEdges: PathwayHierarchyEdge[] = edges
    .filter((e) => e.type === "PART_OF")
    .map((e) => ({
      childId: e.from.id,
      parentId: e.to.id,
    }));

  return (
    <PathwayLeverageView
      seedGeneId={geneId}
      seedGeneSymbol={geneSymbol}
      pathways={pathways}
      hierarchyEdges={hierarchyEdges}
    />
  );
}
