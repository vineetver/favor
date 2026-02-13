import { fetchGene } from "@features/gene/api";
import {
  fetchGraphSchema,
  fetchGraphStats,
  fetchGraphQuery,
  parseTypeId,
} from "@features/graph/api";
import { ExplorerProvider } from "@features/graph/state";
import { GraphExplorerView } from "@features/graph/components";
import type { EntityType } from "@features/graph/types/entity";
import type { EdgeType } from "@features/graph/types/edge";
import type { GraphSchema, GraphStats } from "@features/graph/types/schema";
import type { InitialSubgraphData } from "@features/graph/types/props";
import { GRAPH_LENSES, DEFAULT_LENS, getLensEdgeFields } from "@features/graph/config/lenses";
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

  // Fetch initial subgraph for default lens via /graph/query
  const defaultLens = GRAPH_LENSES.find((l) => l.id === DEFAULT_LENS)!;
  let initialSubgraph: InitialSubgraphData | null = null;

  try {
    const queryResponse = await fetchGraphQuery({
      seeds: [{ type: "Gene", id: geneId }],
      steps: defaultLens.steps.map((s) => ({
        edgeTypes: s.edgeTypes,
        direction: s.direction,
        limit: s.limit,
        sort: s.sort,
        filters: s.filters,
      })),
      select: { edgeFields: getLensEdgeFields(defaultLens) },
      limits: defaultLens.limits,
    });

    if (queryResponse?.data?.edges?.length) {
      // Convert GraphQueryResponse to InitialSubgraphData (JSON-serializable)
      initialSubgraph = {
        nodes: Object.values(queryResponse.data.nodes).map((n) => ({
          id: n.entity.id,
          type: n.entity.type,
          label: n.entity.label,
          subtitle: n.entity.subtitle,
        })),
        edges: queryResponse.data.edges.map((e) => {
          const from = parseTypeId(e.from);
          const to = parseTypeId(e.to);
          return {
            type: e.type,
            fromId: from.id,
            toId: to.id,
            numSources: e.fields?.num_sources as number | undefined,
            numExperiments: e.fields?.num_experiments as number | undefined,
            fields: e.fields,
          };
        }),
      };
    }
  } catch (error) {
    console.error("Failed to fetch initial subgraph:", error);
  }

  return (
    <div className="h-full min-h-[600px]">
      <ExplorerProvider>
        <GraphExplorerView
          seedGeneId={geneId}
          seedGeneSymbol={geneSymbol}
          schema={schema}
          stats={stats}
          initialSubgraph={initialSubgraph}
          initialLensId={DEFAULT_LENS}
          className="h-full"
        />
      </ExplorerProvider>
    </div>
  );
}
