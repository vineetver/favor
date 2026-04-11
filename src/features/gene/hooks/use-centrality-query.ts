"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchCentrality } from "../api";
import type { CentralityData } from "../components/ppi-network/types";

interface UseCentralityQueryOptions {
  seedGeneId: string;
  neighborIds: string[];
  enabled?: boolean;
}

interface CentralityQueryResult {
  data: Map<string, CentralityData> | undefined;
  seedCentrality: CentralityData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * TanStack Query hook for fetching centrality data.
 *
 * Key optimization: Uses sorted neighbor IDs for stable query key,
 * preventing unnecessary refetches when the order changes but content is the same.
 */
export function useCentralityQuery({
  seedGeneId,
  neighborIds,
  enabled = true,
}: UseCentralityQueryOptions): CentralityQueryResult {
  // Sort neighbor IDs for stable query key - prevents refetch on limit change
  // that doesn't add new nodes
  const sortedNeighborIds = useMemo(
    () => [...neighborIds].sort(),
    [neighborIds],
  );

  const query = useQuery({
    queryKey: ["ppi-centrality", seedGeneId, sortedNeighborIds],
    queryFn: async (): Promise<{
      centralityMap: Map<string, CentralityData>;
      seedCentrality: CentralityData | null;
    }> => {
      // Fetch seed gene centrality
      const seedResult = await fetchCentrality("Gene", seedGeneId);

      // Fetch centrality for visible neighbors in batches
      const centralityMap = new Map<string, CentralityData>();
      const batchSize = 10;

      for (let i = 0; i < neighborIds.length; i += batchSize) {
        const batch = neighborIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((id) => fetchCentrality("Gene", id)),
        );

        results.forEach((result, idx) => {
          if (result?.data) {
            centralityMap.set(batch[idx], result.data);
          }
        });
      }

      // Add seed to centrality map
      if (seedResult?.data) {
        centralityMap.set(seedGeneId, seedResult.data);
      }

      return {
        centralityMap,
        seedCentrality: seedResult?.data ?? null,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Centrality data is stable - cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    data: query.data?.centralityMap,
    seedCentrality: query.data?.seedCentrality ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Compute top hubs from centrality data.
 * Memoized for performance.
 */
export function useTopHubs(
  centralityData: Map<string, CentralityData> | undefined,
  seedGeneId: string,
  limit: number = 5,
): CentralityData[] {
  return useMemo(() => {
    if (!centralityData) return [];
    return Array.from(centralityData.values())
      .filter((data) => data.entity.id !== seedGeneId) // Exclude seed from top hubs
      .sort((a, b) => b.hubScore - a.hubScore)
      .slice(0, limit);
  }, [centralityData, seedGeneId, limit]);
}
