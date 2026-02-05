import { fetchGene, fetchSubgraph, type EntityRef } from "@features/gene/api";
import {
  type PathwayHierarchyEdge,
  PathwayLeverageView,
  type PathwayNode,
  parsePathwayFromNode,
} from "@features/gene/components/pathway-map";
import { notFound } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface PathwayLeverageMapPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Fetch the true root category for a pathway by traversing up PART_OF hierarchy.
 * Returns the name of the root pathway (category).
 */
async function fetchRootCategory(pathwayId: string): Promise<string | null> {
  let currentId = pathwayId;
  let rootName: string | null = null;

  // Traverse up to 10 levels
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(currentId)}?include=edges&edgeTypes=PART_OF&direction=in&limitPerEdgeType=1`,
        { next: { revalidate: 3600 } }, // Cache for 1 hour
      );

      if (!response.ok) break;

      const data = await response.json();
      const parents = data.included?.relations?.PART_OF?.rows ?? [];

      if (parents.length === 0) {
        // No parent = this is the root
        rootName = data.data?.pathway_name ?? null;
        break;
      }

      // Move up to parent
      currentId = parents[0].neighbor.id;
      rootName = parents[0].neighbor.name;
    } catch {
      break;
    }
  }

  return rootName;
}

/**
 * Compute category for each pathway by traversing up to find root.
 * First uses local hierarchy edges, then fetches via API for missing roots.
 */
async function computePathwayCategories(
  pathways: PathwayNode[],
  hierarchyEdges: PathwayHierarchyEdge[],
  allPathwayNodes: Map<string, EntityRef>,
): Promise<PathwayNode[]> {
  // Build child-to-parent map from local edges
  const childToParent = new Map<string, string>();
  for (const edge of hierarchyEdges) {
    childToParent.set(edge.childId, edge.parentId);
  }

  // Find local root for each pathway and collect apparent roots that need API lookup
  const pathwayToLocalRoot = new Map<string, string>();
  const apparentRoots = new Set<string>();

  for (const pathway of pathways) {
    let currentId = pathway.id;
    let depth = 0;

    while (depth < 10) {
      const parentId = childToParent.get(currentId);
      if (!parentId) break;
      currentId = parentId;
      depth++;
    }

    pathwayToLocalRoot.set(pathway.id, currentId);

    // If we traversed and stopped at a node that's in our subgraph but might have more parents
    if (currentId !== pathway.id) {
      apparentRoots.add(currentId);
    } else {
      // Pathway itself has no parent in our edges - check if it's truly a root
      apparentRoots.add(pathway.id);
    }
  }

  // Fetch true roots for all apparent roots in parallel
  const rootCache = new Map<string, string>();
  const rootFetches = Array.from(apparentRoots).map(async (apparentRootId) => {
    const node = allPathwayNodes.get(apparentRootId);
    const trueRoot = await fetchRootCategory(apparentRootId);
    rootCache.set(apparentRootId, trueRoot ?? node?.label ?? "Other");
  });

  await Promise.all(rootFetches);

  // Apply categories to pathways
  return pathways.map((pathway) => {
    const localRootId = pathwayToLocalRoot.get(pathway.id) ?? pathway.id;
    const category = rootCache.get(localRootId) ?? pathway.name;

    return {
      ...pathway,
      category,
    };
  });
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
  // maxDepth: 3 for deeper hierarchy, increased limits for richer visualization
  const subgraphResponse = await fetchSubgraph({
    seeds: [{ type: "Gene", id: geneId }],
    maxDepth: 3,
    edgeTypes: ["PARTICIPATES_IN", "PART_OF"],
    nodeLimit: 300,
    edgeLimit: 600,
    includeProps: true,
  });

  const nodes = subgraphResponse?.data?.graph?.nodes ?? [];
  const edges = subgraphResponse?.data?.graph?.edges ?? [];

  // Build map of all pathway nodes for category lookup
  const allPathwayNodes = new Map<string, EntityRef>();
  for (const node of nodes) {
    if (node.type === "Pathway") {
      allPathwayNodes.set(node.id, node);
    }
  }

  // Extract pathways from PARTICIPATES_IN edges (Gene → Pathway)
  const participatingPathwayIds = new Set(
    edges
      .filter((e) => e.type === "PARTICIPATES_IN" && e.from.id === geneId)
      .map((e) => e.to.id),
  );

  // Get pathway nodes that the gene participates in
  const rawPathways: PathwayNode[] = nodes
    .filter((n) => n.type === "Pathway" && participatingPathwayIds.has(n.id))
    .map((n) => parsePathwayFromNode(n));

  // Extract hierarchy edges from PART_OF relationships
  const hierarchyEdges: PathwayHierarchyEdge[] = edges
    .filter((e) => e.type === "PART_OF")
    .map((e) => ({
      childId: e.from.id,
      parentId: e.to.id,
    }));

  // Compute categories by traversing hierarchy to find roots (async for API calls)
  const pathways = await computePathwayCategories(
    rawPathways,
    hierarchyEdges,
    allPathwayNodes,
  );

  return (
    <PathwayLeverageView
      seedGeneId={geneId}
      seedGeneSymbol={geneSymbol}
      pathways={pathways}
      hierarchyEdges={hierarchyEdges}
    />
  );
}
