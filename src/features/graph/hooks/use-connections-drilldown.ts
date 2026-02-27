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
  extractEdgeFields,
  type ConnectionsEdgeItem,
  type SchemaPropertyMeta,
} from "../api";
import { makeNodeKey, makeEdgeKey } from "../types/keys";
import { createEdgeId } from "../utils/keys";
// TODO — remove when backend drops clinvar_annotation edges from VARIANT_IMPLIES_GENE
const isSuppressed = (type: string, fields: Record<string, unknown>) =>
  type === "VARIANT_IMPLIES_GENE" && fields.implication_mode === "clinvar_annotation";

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

interface EntityRef { type: string; id: string; label: string }

/**
 * Convert a backend edge item into an ExplorerEdge.
 * The connections/edge APIs may omit `from`/`to`/`type` on individual edges
 * (they're known from the request/group context), so we accept fallbacks.
 */
function hydrateConnectionEdge(
  item: ConnectionsEdgeItem,
  fallbackFrom: EntityRef,
  fallbackTo: EntityRef,
  fallbackType?: string,
): ExplorerEdge {
  const edgeType = (item.type ?? fallbackType ?? "UNKNOWN") as EdgeType;
  const from = item.from ?? fallbackFrom;
  const to = item.to ?? fallbackTo;
  const fromType = from.type as EntityType;
  const toType = to.type as EntityType;
  const sourceKey = makeNodeKey(fromType, from.id);
  const targetKey = makeNodeKey(toType, to.id);
  const edgeId = createEdgeId(edgeType, from.id, to.id);
  const fields = extractEdgeFields(item);

  return {
    id: edgeId,
    key: makeEdgeKey(edgeType, sourceKey, targetKey),
    type: edgeType,
    sourceId: from.id,
    targetId: to.id,
    sourceKey,
    targetKey,
    numSources: fields.num_sources as number | undefined,
    numExperiments: fields.num_experiments as number | undefined,
    fields,
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
    edgeType: string;
    count: number;
    direction: "out" | "in";
    edges: ConnectionsEdgeItem[];
    hasMore?: boolean;
  }>,
  pairFrom: EntityRef,
  pairTo: EntityRef,
  fieldMeta?: Record<string, SchemaPropertyMeta[]>,
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
    const edgeType = bg.edgeType as EdgeType;
    const localForType = localByType.get(edgeType) ?? [];
    const hasLocalEdges = localForType.length > 0;

    // Hydrate backend edges, dropping suppressed arms (e.g. ClinVar on variant-to-gene)
    const hydratedBackend = bg.edges
      .map((e) => hydrateConnectionEdge(e, pairFrom, pairTo, bg.edgeType))
      .filter((e) => !isSuppressed(edgeType, e.fields ?? {}));

    // Build a map of backend edges by ID for field enrichment
    const backendById = new Map<string, ExplorerEdge>();
    for (const be of hydratedBackend) backendById.set(be.id, be);

    // Enrich local edges with richer backend fields, then append non-duplicate backend edges
    const enrichedLocal = localForType
      .map((le) => {
        const be = backendById.get(le.id);
        if (!be?.fields || Object.keys(be.fields).length === 0) return le;
        // Backend has richer fields — merge (backend wins on overlap)
        return { ...le, fields: { ...le.fields, ...be.fields } };
      })
      .filter((e) => !isSuppressed(edgeType, e.fields ?? {}));
    const newBackendEdges = hydratedBackend.filter((e) => !localEdgeIds.has(e.id));

    // Local edges first (enriched), then new backend edges
    const mergedEdges = [...enrichedLocal, ...newBackendEdges];

    // Skip groups where all edges were suppressed
    if (mergedEdges.length > 0 || hasLocalEdges) {
      groups.push({
        type: edgeType,
        direction: bg.direction,
        totalCount: mergedEdges.length,
        edges: mergedEdges,
        nextCursor: bg.hasMore ? "has_more" : undefined,
        pageStatus: "idle",
        hasLocalEdges,
        propertyMeta: fieldMeta?.[bg.edgeType],
      });
    }

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

    const pairFrom = { type: sourceType, id: sourceId, label: sourceId };
    const pairTo = { type: targetType, id: targetId, label: targetId };

    // Show local edges immediately
    if (localEdges.length > 0) {
      const localGroups = mergeEdges(localEdges, [], pairFrom, pairTo);
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

      // Use response-level from/to (richer labels) when available, else use request params
      const respFrom = response.data?.from ?? pairFrom;
      const respTo = response.data?.to ?? pairTo;
      const groups = mergeEdges(localEdges, response.data?.connections ?? [], respFrom, respTo, response.fieldMeta);
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
          const pageFrom = response.data.from ?? { type: sourceType!, id: sourceId!, label: sourceId! };
          const pageTo = response.data.to ?? { type: targetType!, id: targetId!, label: targetId! };
          const newEdges = response.data.edges
            .map((e) => hydrateConnectionEdge(e, pageFrom, pageTo, edgeType))
            .filter((e) => !existingIds.has(e.id));

          // Attach fieldMeta from pagination response if not already present
          const pageMeta = response.fieldMeta?.[edgeType];

          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              groups: prev.groups.map((g) =>
                g.type === edgeType
                  ? {
                      ...g,
                      edges: [...g.edges, ...newEdges],
                      nextCursor: response.data.nextCursor,
                      pageStatus: "idle" as const,
                      propertyMeta: g.propertyMeta ?? pageMeta,
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
