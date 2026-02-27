"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { fetchIntersection } from "../api";
import type { ContextOverlay, OverlayData } from "../components/ppi-network/types";

interface UseContextOverlayQueryOptions {
  seedGeneId: string;
  neighborIds: string[];
}

interface UseContextOverlayQueryReturn {
  overlayType: ContextOverlay;
  overlayData: Map<string, OverlayData>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setOverlayType: (type: ContextOverlay) => void;
  clearOverlay: () => void;
}

/**
 * TanStack Query hook for fetching context overlay data (shared pathways/diseases).
 *
 * Key optimizations:
 * 1. Uses sorted neighbor IDs for stable query key
 * 2. Reduced limit from 20 to 5 (only need count + preview)
 * 3. Batched requests (5 at a time) to avoid overwhelming API
 * 4. Proper caching with TanStack Query
 */
export function useContextOverlayQuery({
  seedGeneId,
  neighborIds,
}: UseContextOverlayQueryOptions): UseContextOverlayQueryReturn {
  const [overlayType, setOverlayTypeState] = useState<ContextOverlay>("none");

  // Sort neighbor IDs for stable query key
  const sortedNeighborIds = useMemo(
    () => [...neighborIds].sort(),
    [neighborIds]
  );

  // Determine edge type based on overlay type
  const edgeType = useMemo(() => {
    switch (overlayType) {
      case "shared-pathways":
        return "GENE_PARTICIPATES_IN_PATHWAY";
      case "shared-diseases":
        return "GENE_ASSOCIATED_WITH_DISEASE";
      default:
        return null;
    }
  }, [overlayType]);

  const query = useQuery({
    queryKey: ["context-overlay", seedGeneId, sortedNeighborIds, overlayType],
    queryFn: async (): Promise<Map<string, OverlayData>> => {
      if (!edgeType) return new Map();

      const overlayData = new Map<string, OverlayData>();

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
              {
                direction: "out",
                limit: 5, // Reduced from 20 - only need count + preview
              }
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
            overlayData.set(data.nodeId, data);
          }
        });
      }

      return overlayData;
    },
    enabled: overlayType !== "none",
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const setOverlayType = useCallback((type: ContextOverlay) => {
    setOverlayTypeState(type);
  }, []);

  const clearOverlay = useCallback(() => {
    setOverlayTypeState("none");
  }, []);

  return {
    overlayType,
    overlayData: query.data ?? new Map(),
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    error: query.error,
    setOverlayType,
    clearOverlay,
  };
}
