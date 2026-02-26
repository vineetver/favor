import { fetchGene } from "@features/gene/api";
import {
  fetchGraphSchema,
  fetchGraphStats,
  fetchGraphQuery,
  parseTypeId,
} from "@features/graph/api";
import { GraphExplorer } from "@features/graph/components";
import type { EntityType } from "@features/graph/types/entity";
import type { EdgeType } from "@features/graph/types/edge";
import type { GraphSchema, GraphStats } from "@features/graph/types/schema";
import type { InitialSubgraphData } from "@features/graph/types/props";
import { getLensEdgeFields, serializeLensSteps } from "@features/graph/config/lenses";
import { GENE_EXPLORER_CONFIG } from "@features/graph/config/entities/gene";
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

  // Fetch initial subgraph for default template via /graph/query
  const defaultTemplate = GENE_EXPLORER_CONFIG.templates.find(
    (t) => t.id === GENE_EXPLORER_CONFIG.defaultTemplateId
  )!;
  let initialSubgraph: InitialSubgraphData | null = null;

  try {
    const queryResponse = await fetchGraphQuery({
      seeds: [{ type: "Gene", id: geneId }],
      steps: serializeLensSteps(defaultTemplate.steps),
      select: { edgeFields: getLensEdgeFields(defaultTemplate as Parameters<typeof getLensEdgeFields>[0]) },
      limits: defaultTemplate.limits,
    });

    if (queryResponse?.data?.edges?.length) {
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
      <GraphExplorer
        seed={{ type: "Gene", id: geneId, label: geneSymbol }}
        config={GENE_EXPLORER_CONFIG}
        initialSubgraph={initialSubgraph}
        schema={schema}
        stats={stats}
        className="h-full"
      />
    </div>
  );
}
