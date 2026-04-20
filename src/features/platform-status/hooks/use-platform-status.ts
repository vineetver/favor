import { useQuery } from "@tanstack/react-query";
import { fetchPlatformStatus } from "../client";

const REFETCH_MS = 60_000;

export function usePlatformStatus() {
  return useQuery({
    queryKey: ["platform-status"],
    queryFn: ({ signal }) => fetchPlatformStatus(signal),
    staleTime: REFETCH_MS,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
