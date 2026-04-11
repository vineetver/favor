import { fetchGene } from "@features/gene/api";
import {
  fetchGraphQuery,
  fetchGraphSchema,
  fetchGraphStats,
  parseTypeId,
} from "@features/graph/api";
import { GraphExplorer } from "@features/graph/components";
import { GENE_EXPLORER_CONFIG } from "@features/graph/config/entities/gene";
import {
  isBranchStep,
  serializeLensSteps,
} from "@features/graph/config/lenses";
import type { EdgeType } from "@features/graph/types/edge";
import type { EntityType } from "@features/graph/types/entity";
import type { InitialSubgraphData } from "@features/graph/types/props";
import type {
  GraphSchema,
  GraphStats,
  NodeTypeStats,
} from "@features/graph/types/schema";
import {
  buildEdgeTypeStatsMap,
  collectEdgeTypesFromSteps,
  injectSortFields,
  resolveEdgeSelectFields,
} from "@features/graph/utils/schema-fields";
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
        nodeTypes: schemaResponse.data.nodeTypes.map(
          (nt): NodeTypeStats =>
            typeof nt === "string"
              ? { nodeType: nt as EntityType }
              : {
                  nodeType: nt.nodeType as EntityType,
                  description: nt.description,
                  summaryFields: nt.summaryFields,
                  propertyCount: nt.propertyCount,
                  fieldsByCategory: nt.fieldsByCategory,
                },
        ),
        edgeTypes: schemaResponse.data.edgeTypes.map((et) => ({
          edgeType: et.type as EdgeType,
          count: et.count,
          sourceTypes: et.sourceTypes as EntityType[],
          targetTypes: et.targetTypes as EntityType[],
          label: et.label,
          defaultScoreField: et.defaultScoreField,
          scoreFields: et.scoreFields,
          filterFields: et.filterFields,
          fromType: et.sourceTypes?.[0] as EntityType | undefined,
          toType: et.targetTypes?.[0] as EntityType | undefined,
          description: et.description,
          propertyCount: et.propertyCount,
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

  // Build schema map for sort/field resolution
  const schemaMap = buildEdgeTypeStatsMap(schema);

  // Fetch initial subgraph for default template via /graph/query
  const defaultTemplate = GENE_EXPLORER_CONFIG.templates.find(
    (t) => t.id === GENE_EXPLORER_CONFIG.defaultTemplateId,
  )!;
  let initialSubgraph: InitialSubgraphData | null = null;

  try {
    // Cap per-step limits to 10 for fast initial load
    const cappedSteps = defaultTemplate.steps.map((step) => {
      if (isBranchStep(step)) {
        return {
          branch: step.branch.map((s) => ({
            ...s,
            limit: Math.min(s.limit ?? 1000, 10),
          })),
        };
      }
      return { ...step, limit: Math.min(step.limit ?? 1000, 10) };
    });

    // Inject schema-driven sorts into steps
    const stepsWithSorts = injectSortFields(cappedSteps, schemaMap);

    // Compute edge fields from schema (or fallback to hardcoded catalog)
    const allEdgeTypes = collectEdgeTypesFromSteps(defaultTemplate.steps);
    const edgeFields = resolveEdgeSelectFields(allEdgeTypes, schemaMap);

    const queryResponse = await fetchGraphQuery({
      seeds: [{ type: "Gene", id: geneId }],
      steps: serializeLensSteps(stepsWithSorts),
      select: { edgeFields },
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
