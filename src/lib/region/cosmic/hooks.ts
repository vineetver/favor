import { useQuery } from "@tanstack/react-query";
import { fetchCosmicByRegion } from "@/lib/region/cosmic/api";
import type { Cosmic } from "./columns";

export function useCosmicData(region: string) {
  return useQuery({
    queryKey: ["cosmic", region],
    queryFn: () => fetchCosmicByRegion(region),
    enabled: !!region,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}