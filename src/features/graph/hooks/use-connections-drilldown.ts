"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EdgeType } from "../types/edge";
import type { ExplorerEdge } from "../types/node";
import type { EntityType } from "../types/entity";
import type {
  ConnectionsDrilldownData,
  ConnectionsEdgeGroup,
  ConnectionsStatus,
} from "../types/connections";
import {
  fetchConnections,
  fetchEdgePage,
  type ConnectionsEdgeItem,
} from "../api";
import { makeNodeKey, makeEdgeKey } from "../types/keys";
import { createEdgeId } from "../utils/keys";

interface UseConnectionsDrilldownOptions {
  sourceId: string | null;
  targetId: string | null;
  sourceType: string | null;
  targetType: string | null;
  localEdges: ExplorerEdge[];
}

interface UseConnectionsDrilldownResult {
  status: ConnectionsStatus;
  data: ConnectionsDrilldownData | null;
  error: string | null;
  loadMoreEdges: (edgeType: EdgeType) => void;
  retry: () => void;
}

/** Convert a backend edge item into an ExplorerEdge */
function hydrateConnectionEdge(item: ConnectionsEdgeItem): ExplorerEdge {
  const edgeType = item.type as EdgeType;
  const fromType = item.from.type as EntityType;
  const toType = item.to.type as EntityType;
  const sourceKey = makeNodeKey(fromType, item.from.id);
  const targetKey = makeNodeKey(toType, item.to.id);
  const edgeId = createEdgeId(edgeType, item.from.id, item.to.id);

  return {
    id: edgeId,
    key: makeEdgeKey(edgeType, sourceKey, targetKey),
    type: edgeType,
    sourceId: item.from.id,
    targetId: item.to.id,
    sourceKey,
    targetKey,
    numSources: item.fields?.num_sources as number | undefined,
    numExperiments: item.fields?.num_experiments as number | undefined,
    fields: item.fields,
  };
}

/**
 * Merge local edges with backend edges.
 * Local edges win on ID conflict. Returns groups sorted by:
 * 1. Groups with local edges first
 * 2. Then by total count descending
 */
function mergeEdges(
  localEdges: ExplorerEdge[],
  backendGroups: Array<{
    type: string;
    count: number;
    direction: "out" | "in";
    edges: ConnectionsEdgeItem[];
  }>,
): ConnectionsEdgeGroup[] {
  // Build local edge map by type
  const localByType = new Map<EdgeType, ExplorerEdge[]>();
  for (const edge of localEdges) {
    const existing = localByType.get(edge.type) ?? [];
    existing.push(edge);
    localByType.set(edge.type, existing);
  }

  // Build local edge ID set for dedup
  const localEdgeIds = new Set(localEdges.map((e) => e.id));

  const groups: ConnectionsEdgeGroup[] = [];

  // Process backend groups
  for (const bg of backendGroups) {
    const edgeType = bg.type as EdgeType;
    const localForType = localByType.get(edgeType) ?? [];
    const hasLocalEdges = localForType.length > 0;

    // Hydrate backend edges, dedup against local
    const backendEdges = bg.edges
      .map(hydrateConnectionEdge)
      .filter((e) => !localEdgeIds.has(e.id));

    // Local edges first, then backend edges
    const mergedEdges = [...localForType, ...backendEdges];

    groups.push({
      type: edgeType,
      direction: bg.direction,
      totalCount: bg.count,
      edges: mergedEdges,
      pageStatus: "idle",
      hasLocalEdges,
    });

    // Remove from local map so we know what's been handled
    localByType.delete(edgeType);
  }

  // Any remaining local-only types not in backend response
  for (const [edgeType, edges] of localByType) {
    groups.push({
      type: edgeType,
      direction: "out",
      totalCount: edges.length,
      edges,
      pageStatus: "idle",
      hasLocalEdges: true,
    });
  }

  // Sort: local-edge groups first, then by count desc
  groups.sort((a, b) => {
    if (a.hasLocalEdges !== b.hasLocalEdges) return a.hasLocalEdges ? -1 : 1;
    return b.totalCount - a.totalCount;
  });

  return groups;
}

export function useConnectionsDrilldown({
  sourceId,
  targetId,
  sourceType,
  targetType,
  localEdges,
}: UseConnectionsDrilldownOptions): UseConnectionsDrilldownResult {
  const [status, setStatus] = useState<ConnectionsStatus>("idle");
  const [data, setData] = useState<ConnectionsDrilldownData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AbortController for the main connections request
  const connectionsAbortRef = useRef<AbortController | null>(null);
  // Per-edge-type AbortControllers for pagination
  const pageAbortRefs = useRef<Map<EdgeType, AbortController>>(new Map());

  // Track current pair to detect changes
  const pairRef = useRef<string | null>(null);

  const fetchConnectionsData = useCallback(async () => {
    if (!sourceId || !targetId || !sourceType || !targetType) {
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }

    const pairKey = `${sourceId}:${targetId}`;

    // Abort previous request
    connectionsAbortRef.current?.abort();
    for (const controller of pageAbortRefs.current.values()) {
      controller.abort();
    }
    pageAbortRefs.current.clear();

    pairRef.current = pairKey;

    const controller = new AbortController();
    connectionsAbortRef.current = controller;

    setStatus("loading");
    setError(null);

    // Show local edges immediately
    if (localEdges.length > 0) {
      const localGroups = mergeEdges(localEdges, []);
      setData({ sourceId, targetId, groups: localGroups });
    }

    try {
      const response = await fetchConnections({
        from: { type: sourceType, id: sourceId },
        to: { type: targetType, id: targetId },
        limitPerType: 10,
        includeReverse: true,
        signal: controller.signal,
      });

      // Check if this request is still current
      if (pairRef.current !== pairKey) return;

      if (!response) {
        // Null response = aborted or error. If aborted, fetchConnections returns null silently.
        // If we still match the pair, it's a real error.
        if (!controller.signal.aborted) {
          setStatus("error");
          setError("Failed to load connections");
        }
        return;
      }

      const groups = mergeEdges(localEdges, response.edgeTypes ?? []);
      setData({ sourceId, targetId, groups });
      setStatus("ready");
    } catch (err) {
      if (pairRef.current !== pairKey) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load connections");
    }
  }, [sourceId, targetId, sourceType, targetType, localEdges]);

  // Fire on edge selection change
  useEffect(() => {
    fetchConnectionsData();

    return () => {
      connectionsAbortRef.current?.abort();
      for (const controller of pageAbortRefs.current.values()) {
        controller.abort();
      }
      pageAbortRefs.current.clear();
    };
  }, [fetchConnectionsData]);

  // Reset when no selection
  useEffect(() => {
    if (!sourceId || !targetId) {
      setStatus("idle");
      setData(null);
      setError(null);
    }
  }, [sourceId, targetId]);

  const loadMoreEdges = useCallback(
    (edgeType: EdgeType) => {
      if (!data || !sourceId || !targetId || !sourceType || !targetType) return;

      const group = data.groups.find((g) => g.type === edgeType);
      if (!group || !group.nextCursor || group.pageStatus === "loading") return;

      // Abort any previous pagination for this type
      pageAbortRefs.current.get(edgeType)?.abort();
      const controller = new AbortController();
      pageAbortRefs.current.set(edgeType, controller);

      // Set page loading status
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) =>
            g.type === edgeType ? { ...g, pageStatus: "loading" as const } : g,
          ),
        };
      });

      fetchEdgePage({
        from: `${sourceType}:${sourceId}`,
        to: `${targetType}:${targetId}`,
        edgeType,
        limit: 25,
        cursor: group.nextCursor,
        signal: controller.signal,
      })
        .then((response) => {
          if (!response) {
            if (!controller.signal.aborted) {
              setData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  groups: prev.groups.map((g) =>
                    g.type === edgeType ? { ...g, pageStatus: "error" as const } : g,
                  ),
                };
              });
            }
            return;
          }

          const existingIds = new Set(group.edges.map((e) => e.id));
          const newEdges = response.edges
            .map(hydrateConnectionEdge)
            .filter((e) => !existingIds.has(e.id));

          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              groups: prev.groups.map((g) =>
                g.type === edgeType
                  ? {
                      ...g,
                      edges: [...g.edges, ...newEdges],
                      nextCursor: response.nextCursor,
                      pageStatus: "idle" as const,
                    }
                  : g,
              ),
            };
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                groups: prev.groups.map((g) =>
                  g.type === edgeType ? { ...g, pageStatus: "error" as const } : g,
                ),
              };
            });
          }
        });
    },
    [data, sourceId, targetId, sourceType, targetType],
  );

  const retry = useCallback(() => {
    fetchConnectionsData();
  }, [fetchConnectionsData]);

  return { status, data, error, loadMoreEdges, retry };
}
