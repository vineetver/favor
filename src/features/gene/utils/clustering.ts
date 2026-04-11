import type { PPIEdge } from "../components/ppi-network/types";

/**
 * Simple Louvain-like modularity-based community detection
 * This is a simplified version that works well for small to medium networks
 */
export function detectCommunities(
  nodeIds: string[],
  edges: PPIEdge[],
  resolution: number = 1.0,
): Map<string, string[]> {
  // Build adjacency map with edge weights
  const adjacency = new Map<string, Map<string, number>>();
  const nodeDegrees = new Map<string, number>();

  // Initialize adjacency map for all nodes
  nodeIds.forEach((id) => {
    adjacency.set(id, new Map());
    nodeDegrees.set(id, 0);
  });

  // Populate adjacency map (undirected graph)
  edges.forEach((edge) => {
    const weight = edge.numSources ?? 1;

    // Source -> Target
    const sourceAdj = adjacency.get(edge.sourceId);
    if (sourceAdj) {
      sourceAdj.set(edge.targetId, weight);
      nodeDegrees.set(
        edge.sourceId,
        (nodeDegrees.get(edge.sourceId) ?? 0) + weight,
      );
    }

    // Target -> Source (undirected)
    const targetAdj = adjacency.get(edge.targetId);
    if (targetAdj) {
      targetAdj.set(edge.sourceId, weight);
      nodeDegrees.set(
        edge.targetId,
        (nodeDegrees.get(edge.targetId) ?? 0) + weight,
      );
    }
  });

  // Total edge weight (2m in modularity formula)
  const totalWeight =
    edges.reduce((sum, e) => sum + (e.numSources ?? 1), 0) * 2;

  // Initial community assignment: each node in its own community
  const communities = new Map<string, string>();
  nodeIds.forEach((id) => communities.set(id, id));

  // Iterative optimization
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Randomize node order for each iteration
    const shuffledNodes = [...nodeIds].sort(() => Math.random() - 0.5);

    for (const nodeId of shuffledNodes) {
      const currentCommunity = communities.get(nodeId)!;
      const nodeNeighbors = adjacency.get(nodeId)!;
      const nodeDegree = nodeDegrees.get(nodeId)!;

      // Calculate modularity gain for moving to each neighbor's community
      const communityGains = new Map<string, number>();

      nodeNeighbors.forEach((weight, neighborId) => {
        const neighborCommunity = communities.get(neighborId)!;
        if (neighborCommunity !== currentCommunity) {
          const currentGain = communityGains.get(neighborCommunity) ?? 0;
          communityGains.set(neighborCommunity, currentGain + weight);
        }
      });

      // Find best community to move to
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      communityGains.forEach((edgesToCommunity, community) => {
        // Simplified modularity gain calculation
        const gain =
          resolution * edgesToCommunity -
          (nodeDegree *
            getCommunityDegree(communities, nodeDegrees, community)) /
            totalWeight;
        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = community;
        }
      });

      // Move node to best community if improvement found
      if (bestCommunity !== currentCommunity) {
        communities.set(nodeId, bestCommunity);
        improved = true;
      }
    }
  }

  // Convert to cluster map (clusterId -> nodeIds)
  const clusters = new Map<string, string[]>();
  communities.forEach((community, nodeId) => {
    if (!clusters.has(community)) {
      clusters.set(community, []);
    }
    clusters.get(community)?.push(nodeId);
  });

  // Filter out single-node clusters and renumber
  const result = new Map<string, string[]>();
  let clusterIndex = 0;

  clusters.forEach((members) => {
    if (members.length > 1) {
      result.set(`cluster-${clusterIndex++}`, members);
    }
  });

  return result;
}

/**
 * Get total degree of nodes in a community
 */
function getCommunityDegree(
  communities: Map<string, string>,
  nodeDegrees: Map<string, number>,
  targetCommunity: string,
): number {
  let total = 0;
  communities.forEach((community, nodeId) => {
    if (community === targetCommunity) {
      total += nodeDegrees.get(nodeId) ?? 0;
    }
  });
  return total;
}

/**
 * Simple label propagation clustering algorithm
 * Fast alternative to modularity-based methods
 */
export function labelPropagation(
  nodeIds: string[],
  edges: PPIEdge[],
  maxIterations: number = 10,
): Map<string, string[]> {
  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  nodeIds.forEach((id) => adjacency.set(id, new Set()));

  edges.forEach((edge) => {
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
  });

  // Initialize labels: each node has its own label
  const labels = new Map<string, string>();
  nodeIds.forEach((id) => labels.set(id, id));

  // Iterate until convergence or max iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    const shuffledNodes = [...nodeIds].sort(() => Math.random() - 0.5);

    for (const nodeId of shuffledNodes) {
      const neighbors = adjacency.get(nodeId)!;
      if (neighbors.size === 0) continue;

      // Count label frequencies among neighbors
      const labelCounts = new Map<string, number>();
      neighbors.forEach((neighbor) => {
        const label = labels.get(neighbor)!;
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      });

      // Find most frequent label
      let maxCount = 0;
      let maxLabel = labels.get(nodeId)!;
      labelCounts.forEach((count, label) => {
        if (count > maxCount) {
          maxCount = count;
          maxLabel = label;
        }
      });

      // Update label if different
      if (labels.get(nodeId) !== maxLabel) {
        labels.set(nodeId, maxLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Convert to cluster map
  const clusters = new Map<string, string[]>();
  labels.forEach((label, nodeId) => {
    if (!clusters.has(label)) {
      clusters.set(label, []);
    }
    clusters.get(label)?.push(nodeId);
  });

  // Filter and renumber
  const result = new Map<string, string[]>();
  let clusterIndex = 0;
  clusters.forEach((members) => {
    if (members.length > 1) {
      result.set(`cluster-${clusterIndex++}`, members);
    }
  });

  return result;
}

/**
 * Get cluster statistics
 */
export function getClusterStats(clusters: Map<string, string[]>): {
  numClusters: number;
  avgSize: number;
  maxSize: number;
  minSize: number;
} {
  if (clusters.size === 0) {
    return { numClusters: 0, avgSize: 0, maxSize: 0, minSize: 0 };
  }

  const sizes = Array.from(clusters.values()).map((c) => c.length);
  return {
    numClusters: clusters.size,
    avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    maxSize: Math.max(...sizes),
    minSize: Math.min(...sizes),
  };
}

/**
 * Get cluster color based on cluster index
 * Uses a visually distinct palette
 */
export function getClusterColor(clusterIndex: number): {
  background: string;
  border: string;
} {
  const colors = [
    { background: "#dbeafe", border: "#3b82f6" }, // blue
    { background: "#dcfce7", border: "#22c55e" }, // green
    { background: "#fef3c7", border: "#f59e0b" }, // amber
    { background: "#fce7f3", border: "#ec4899" }, // pink
    { background: "#e0e7ff", border: "#6366f1" }, // indigo
    { background: "#ffedd5", border: "#f97316" }, // orange
    { background: "#f3e8ff", border: "#a855f7" }, // purple
    { background: "#ccfbf1", border: "#14b8a6" }, // teal
  ];

  return colors[clusterIndex % colors.length];
}
