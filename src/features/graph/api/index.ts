const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// =============================================================================
// Entity Reference
// =============================================================================

export interface EntityRef {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
}

// =============================================================================
// Subgraph API
// =============================================================================

export interface SubgraphEdge {
  type: string;
  direction: "out" | "in";
  from: EntityRef;
  to: EntityRef;
  props?: {
    src_symbol?: string;
    dst_symbol?: string;
    sources?: string[];
    num_sources?: number;
    num_experiments?: number;
    confidence_scores?: number[];
    pubmed_ids?: string[];
    detection_methods?: string[];
    interaction_type?: string;
    [key: string]: unknown;
  };
  evidence?: {
    pubmedIds?: string[];
  };
}

export interface SubgraphApiResponse {
  meta: {
    requestId: string;
    generatedAt: string;
    warnings: string[];
  };
  data: {
    seeds: EntityRef[];
    graph: {
      nodes: EntityRef[];
      edges: SubgraphEdge[];
    };
    summary: {
      nodeCounts: Record<string, number>;
      edgeCounts: Record<string, number>;
      depthReached: number;
    };
  };
}

export interface FetchSubgraphOptions {
  seeds: Array<{ type: string; id: string }>;
  maxDepth?: number;
  edgeTypes?: string[];
  nodeLimit?: number;
  edgeLimit?: number;
  includeProps?: boolean;
}

export async function fetchSubgraph(
  options: FetchSubgraphOptions,
): Promise<SubgraphApiResponse | null> {
  const url = `${API_BASE}/graph/subgraph`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seeds: options.seeds,
        maxDepth: options.maxDepth ?? 1,
        edgeTypes: options.edgeTypes,
        nodeLimit: options.nodeLimit ?? 100,
        edgeLimit: options.edgeLimit ?? 200,
        includeProps: options.includeProps ?? false,
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Subgraph fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Subgraph fetch error:", error);
    return null;
  }
}

// =============================================================================
// Graph Query API
// =============================================================================

export interface GraphQueryStep {
  edgeTypes: string[];
  direction: "in" | "out" | "both";
  limit?: number;
  sort?: string;
  filters?: Record<string, unknown>;
}

export interface GraphQueryOptions {
  seeds: Array<{ type: string; id: string }>;
  steps: GraphQueryStep[];
  select?: {
    nodeFields?: string[];
    edgeFields?: string[];
    includeEvidence?: boolean;
  };
  limits?: {
    maxNodes?: number;
    maxEdges?: number;
  };
}

export interface GraphQueryResponse {
  meta: {
    requestId: string;
    generatedAt: string;
    warnings: string[];
    cost?: {
      nodesResolved: number;
      edgesReturned: number;
      queriesExecuted: number;
    };
  };
  data: {
    nodes: Record<string, {
      entity: EntityRef;
      fields?: Record<string, unknown>;
    }>;
    edges: Array<{
      type: string;
      direction: string;
      from: string;
      to: string;
      fields?: Record<string, unknown>;
      evidence?: unknown;
    }>;
    steps: Array<{
      stepIndex: number;
      edgeTypes: string[];
      direction: string;
      resultType: string;
      count: number;
    }>;
  };
}

export function parseTypeId(typeId: string): { type: string; id: string } {
  const colonIdx = typeId.indexOf(":");
  if (colonIdx === -1) return { type: "", id: typeId };
  return {
    type: typeId.substring(0, colonIdx),
    id: typeId.substring(colonIdx + 1),
  };
}

export async function fetchGraphQuery(
  options: GraphQueryOptions,
): Promise<GraphQueryResponse | null> {
  const url = `${API_BASE}/graph/query`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seeds: options.seeds,
        steps: options.steps,
        select: options.select,
        limits: options.limits ?? { maxNodes: 200, maxEdges: 500 },
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Graph query failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Graph query error:", error);
    return null;
  }
}

// =============================================================================
// Centrality API
// =============================================================================

export interface CentralityResponse {
  data: {
    entity: { type: string; id: string; label: string };
    degree: { in: number; out: number; total: number };
    percentile: { in: number; out: number; total: number };
    hubScore: number;
  };
}

export async function fetchCentrality(
  type: string,
  id: string,
): Promise<CentralityResponse | null> {
  const url = `${API_BASE}/graph/${encodeURIComponent(type)}/${encodeURIComponent(id)}/centrality`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Centrality fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Centrality fetch error:", error);
    return null;
  }
}

// =============================================================================
// Paths API
// =============================================================================

export interface PathNode {
  type: string;
  id: string;
  label: string;
}

export interface PathEdge {
  type: string;
  from: PathNode;
  to: PathNode;
}

export interface PathResult {
  rank: number;
  length: number;
  pathText: string;
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface PathsResponse {
  data: {
    from: PathNode;
    to: PathNode;
    paths: PathResult[];
  };
}

export interface FetchPathsOptions {
  maxHops?: number;
  limit?: number;
  edgeTypes?: string[];
}

export async function fetchPaths(
  from: string,
  to: string,
  options?: FetchPathsOptions,
): Promise<PathsResponse | null> {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);

  if (options?.maxHops) params.set("maxHops", String(options.maxHops));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.edgeTypes?.length) {
    params.set("edgeTypes", options.edgeTypes.join(","));
  }

  const url = `${API_BASE}/graph/paths?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Paths fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Paths fetch error:", error);
    return null;
  }
}

// =============================================================================
// Intersection API
// =============================================================================

export interface SharedNeighbor {
  neighbor: { type: string; id: string; label: string };
  support: Array<{
    from: { type: string; id: string; label: string };
    edge: { type: string };
  }>;
}

export interface IntersectResponse {
  data: {
    inputs: Array<{ type: string; id: string; label: string }>;
    neighborType: string;
    sharedNeighbors: SharedNeighbor[];
    counts: { shared: number; limit: number };
  };
}

export interface FetchIntersectionOptions {
  direction?: "in" | "out";
  limit?: number;
}

export async function fetchIntersection(
  entities: Array<{ type: string; id: string }>,
  edgeType: string,
  options?: FetchIntersectionOptions,
): Promise<IntersectResponse | null> {
  const url = `${API_BASE}/graph/intersect`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entities,
        edgeType,
        direction: options?.direction ?? "out",
        limit: options?.limit ?? 50,
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Intersection fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Intersection fetch error:", error);
    return null;
  }
}

// =============================================================================
// Graph Schema API
// =============================================================================

export interface GraphSchemaResponse {
  data: {
    nodeTypes: string[];
    edgeTypes: Array<{
      type: string;
      count: number;
      sourceTypes: string[];
      targetTypes: string[];
    }>;
    lastUpdated?: string;
  };
}

export async function fetchGraphSchema(): Promise<GraphSchemaResponse | null> {
  const url = `${API_BASE}/graph/schema`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Graph schema fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Graph schema fetch error:", error);
    return null;
  }
}

// =============================================================================
// Graph Stats API
// =============================================================================

export interface GraphStatsResponse {
  data: {
    totalNodes: number;
    totalEdges: number;
    nodeCounts: Record<string, number>;
    edgeCounts: Record<string, number>;
  };
}

export async function fetchGraphStats(): Promise<GraphStatsResponse | null> {
  const url = `${API_BASE}/graph/stats`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Graph stats fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Graph stats fetch error:", error);
    return null;
  }
}

// =============================================================================
// Entity Search API
// =============================================================================

export interface SearchResultEntity {
  type: string;
  id: string;
  label: string;
  score: number;
}

export interface EntitySearchResponse {
  data: {
    results: SearchResultEntity[];
    totalCount: number;
  };
}

export async function searchEntities(
  query: string,
  types?: string[],
  limit: number = 20,
): Promise<EntitySearchResponse | null> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  if (types?.length) {
    params.set("types", types.join(","));
  }

  const url = `${API_BASE}/graph/search?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`Entity search failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Entity search error:", error);
    return null;
  }
}
