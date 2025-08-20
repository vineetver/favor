import { useQuery } from "@tanstack/react-query";
import { fetchCosmicByGene } from "@/lib/gene/api";
import type { Cosmic } from "./columns";

export function useCosmicData(geneName: string) {
  return useQuery({
    queryKey: ["cosmic", geneName],
    queryFn: () => fetchCosmicByGene(geneName),
    enabled: !!geneName,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}