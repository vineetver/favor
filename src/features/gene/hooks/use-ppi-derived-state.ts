"use client";

import type { ElementDefinition } from "cytoscape";
import { useMemo } from "react";
import type {
  CentralityData,
  EdgeFilterConfig,
  PPIEdge,
} from "../components/ppi-network/types";
import {
  createEdgeMap,
  transformToCytoscapeElements,
} from "../utils/ppi-graph-utils";

interface UsePPIDerivedStateOptions {
  seedGeneId: string;
  seedGeneSymbol: string;
  allEdges: PPIEdge[];
  limit: number;
  edgeFilter?: EdgeFilterConfig;
  centralityData?: Map<string, CentralityData>;
}

interface PPIDerivedState {
  /** Edges limited by the current limit setting */
  limitedEdges: PPIEdge[];
  /** IDs of neighbor nodes (excluding seed) */
  neighborIds: string[];
  /** Map of edge ID to edge data for quick lookup */
  edgeMap: Map<string, PPIEdge>;
  /** Cytoscape elements (nodes + edges) */
  elements: ElementDefinition[];
  /** Maximum experiments value for slider range */
  maxExperiments: number;
  /** Nodes that should be visible (handles hide-cascade) */
  visibleNodeIds: Set<string>;
  /** Edges that pass the current filter */
  visibleEdgeIds: Set<string>;
  /** Top hub genes by hub score */
  topHubs: CentralityData[];
}

/**
 * Centralized hook for all derived state calculations in PPI network.
 * This replaces scattered useMemo calls throughout ppi-network-view.tsx
 * and ensures consistent dependency tracking.
 */
export function usePPIDerivedState({
  seedGeneId,
  seedGeneSymbol,
  allEdges,
  limit,
  edgeFilter,
  centralityData,
}: UsePPIDerivedStateOptions): PPIDerivedState {
  // Limit edges based on current limit setting
  const limitedEdges = useMemo(() => {
    return allEdges.slice(0, limit);
  }, [allEdges, limit]);

  // Compute neighbor IDs from limited edges
  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    limitedEdges.forEach((edge) => {
      if (edge.sourceId !== seedGeneId) ids.add(edge.sourceId);
      if (edge.targetId !== seedGeneId) ids.add(edge.targetId);
    });
    return Array.from(ids);
  }, [limitedEdges, seedGeneId]);

  // Edge map for quick lookup
  const edgeMap = useMemo(() => createEdgeMap(limitedEdges), [limitedEdges]);

  // Cytoscape elements
  const elements = useMemo(
    () =>
      transformToCytoscapeElements(
        { id: seedGeneId, symbol: seedGeneSymbol },
        limitedEdges,
      ),
    [seedGeneId, seedGeneSymbol, limitedEdges],
  );

  // Max experiments for slider range
  const maxExperiments = useMemo(() => {
    return allEdges.reduce(
      (max, edge) => Math.max(max, edge.numExperiments ?? 0),
      0,
    );
  }, [allEdges]);

  // Visible edges based on filter
  const visibleEdgeIds = useMemo(() => {
    const visible = new Set<string>();

    if (
      !edgeFilter ||
      (edgeFilter.minSources === 0 && edgeFilter.minExperiments === 0)
    ) {
      // No filter active - all edges visible
      limitedEdges.forEach((edge) => visible.add(edge.id));
      return visible;
    }

    limitedEdges.forEach((edge) => {
      const numSources = edge.numSources ?? 0;
      const numExperiments = edge.numExperiments ?? 0;

      const passesFilter =
        numSources >= edgeFilter.minSources &&
        numExperiments >= edgeFilter.minExperiments;

      if (passesFilter) {
        visible.add(edge.id);
      }
    });

    return visible;
  }, [limitedEdges, edgeFilter]);

  // Visible nodes (handles hide-cascade mode)
  const visibleNodeIds = useMemo(() => {
    const visible = new Set<string>();

    // Seed is always visible
    visible.add(seedGeneId);

    if (!edgeFilter || edgeFilter.display !== "hide-cascade") {
      // No cascade - all nodes visible
      neighborIds.forEach((id) => visible.add(id));
      return visible;
    }

    // In hide-cascade mode, only show nodes connected by visible edges
    limitedEdges.forEach((edge) => {
      if (visibleEdgeIds.has(edge.id)) {
        visible.add(edge.sourceId);
        visible.add(edge.targetId);
      }
    });

    return visible;
  }, [seedGeneId, neighborIds, limitedEdges, edgeFilter, visibleEdgeIds]);

  // Top hubs from centrality data
  const topHubs = useMemo(() => {
    if (!centralityData) return [];
    return Array.from(centralityData.values())
      .filter((data) => data.entity.id !== seedGeneId) // Exclude seed
      .sort((a, b) => b.hubScore - a.hubScore)
      .slice(0, 5);
  }, [centralityData, seedGeneId]);

  return {
    limitedEdges,
    neighborIds,
    edgeMap,
    elements,
    maxExperiments,
    visibleNodeIds,
    visibleEdgeIds,
    topHubs,
  };
}
