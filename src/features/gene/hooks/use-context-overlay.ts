"use client";

import { useCallback, useState } from "react";
import { fetchIntersection } from "../api";
import type { ContextOverlay, OverlayData } from "../components/ppi-network/types";

interface UseContextOverlayOptions {
  seedGeneId: string;
  neighborIds: string[];
}

interface UseContextOverlayReturn {
  overlayType: ContextOverlay;
  overlayData: Map<string, OverlayData>;
  isLoading: boolean;
  error: string | null;
  setOverlayType: (type: ContextOverlay) => void;
  fetchOverlayForNode: (nodeId: string) => Promise<void>;
  clearOverlay: () => void;
}

/**
 * Hook for fetching and managing context overlay data (shared pathways/diseases)
 */
export function useContextOverlay({
  seedGeneId,
  neighborIds,
}: UseContextOverlayOptions): UseContextOverlayReturn {
  const [overlayType, setOverlayTypeState] = useState<ContextOverlay>("none");
  const [overlayData, setOverlayData] = useState<Map<string, OverlayData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOverlayType = useCallback(
    async (type: ContextOverlay) => {
      setOverlayTypeState(type);

      if (type === "none") {
        setOverlayData(new Map());
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const edgeType = type === "shared-pathways" ? "PARTICIPATES_IN" : "ASSOCIATED_WITH";
        const newOverlayData = new Map<string, OverlayData>();

        // Fetch shared context for each neighbor with the seed gene
        // Batch requests in groups of 5 to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < neighborIds.length; i += batchSize) {
          const batch = neighborIds.slice(i, i + batchSize);

          const results = await Promise.all(
            batch.map(async (neighborId) => {
              const result = await fetchIntersection(
                [
                  { type: "Gene", id: seedGeneId },
                  { type: "Gene", id: neighborId },
                ],
                edgeType,
                { direction: "out", limit: 20 }
              );

              if (result?.data?.sharedNeighbors) {
                return {
                  nodeId: neighborId,
                  sharedCount: result.data.sharedNeighbors.length,
                  items: result.data.sharedNeighbors.map((n) => ({
                    id: n.neighbor.id,
                    name: n.neighbor.label,
                  })),
                };
              }
              return null;
            })
          );

          results.forEach((data) => {
            if (data && data.sharedCount > 0) {
              newOverlayData.set(data.nodeId, data);
            }
          });
        }

        setOverlayData(newOverlayData);
      } catch (err) {
        console.error("Failed to fetch context overlay:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch overlay data");
      } finally {
        setIsLoading(false);
      }
    },
    [seedGeneId, neighborIds]
  );

  const fetchOverlayForNode = useCallback(
    async (nodeId: string) => {
      if (overlayType === "none" || overlayData.has(nodeId)) return;

      const edgeType = overlayType === "shared-pathways" ? "PARTICIPATES_IN" : "ASSOCIATED_WITH";

      try {
        const result = await fetchIntersection(
          [
            { type: "Gene", id: seedGeneId },
            { type: "Gene", id: nodeId },
          ],
          edgeType,
          { direction: "out", limit: 20 }
        );

        if (result?.data?.sharedNeighbors) {
          setOverlayData((prev) => {
            const next = new Map(prev);
            next.set(nodeId, {
              nodeId,
              sharedCount: result.data.sharedNeighbors.length,
              items: result.data.sharedNeighbors.map((n) => ({
                id: n.neighbor.id,
                name: n.neighbor.label,
              })),
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch overlay for node:", err);
      }
    },
    [overlayType, overlayData, seedGeneId]
  );

  const clearOverlay = useCallback(() => {
    setOverlayTypeState("none");
    setOverlayData(new Map());
    setError(null);
  }, []);

  return {
    overlayType,
    overlayData,
    isLoading,
    error,
    setOverlayType,
    fetchOverlayForNode,
    clearOverlay,
  };
}
