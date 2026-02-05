import {
  fetchGene,
  fetchGraphSchema,
  fetchGraphStats,
} from "@features/gene/api";
import { GraphExplorerView } from "@features/gene/components/graph-explorer";
import type { EntityType, EdgeType, GraphSchema, GraphStats } from "@features/gene/components/graph-explorer/types";
import { notFound } from "next/navigation";

interface GraphExplorerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GraphExplorerPage({
  params,
}: GraphExplorerPageProps) {
  const { id } = await params;

  // Fetch gene data, schema, and stats in parallel
  const [geneResponse, schemaResponse, statsResponse] = await Promise.all([
    fetchGene(id),
    fetchGraphSchema(),
    fetchGraphStats(),
  ]);

  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  // Extract gene ID and symbol
  const geneId = gene.gene_id_versioned?.split(".")[0] || id;
  const geneSymbol = gene.gene_symbol ?? geneId;

  // Transform schema response to component format
  const schema: GraphSchema | null = schemaResponse?.data
    ? {
        nodeTypes: schemaResponse.data.nodeTypes as EntityType[],
        edgeTypes: schemaResponse.data.edgeTypes.map((et) => ({
          edgeType: et.type as EdgeType,
          count: et.count,
          sourceTypes: et.sourceTypes as EntityType[],
          targetTypes: et.targetTypes as EntityType[],
        })),
        lastUpdated: schemaResponse.data.lastUpdated,
      }
    : null;

  // Transform stats response to component format
  const stats: GraphStats | null = statsResponse?.data
    ? {
        totalNodes: statsResponse.data.totalNodes,
        totalEdges: statsResponse.data.totalEdges,
        nodeCounts: statsResponse.data.nodeCounts as Record<EntityType, number>,
        edgeCounts: statsResponse.data.edgeCounts as Record<EdgeType, number>,
      }
    : null;

  return (
    <div className="h-full min-h-[600px]">
      <GraphExplorerView
        seedGeneId={geneId}
        seedGeneSymbol={geneSymbol}
        schema={schema}
        stats={stats}
        className="h-full"
      />
    </div>
  );
}
