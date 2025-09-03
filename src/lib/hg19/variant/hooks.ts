import { useQuery } from "@tanstack/react-query";
import { fetchHg19Variant } from "./api";
import type { VariantHg19 } from "./types";

export function useHg19Variant(vcf: string) {
  return useQuery({
    queryKey: ["hg19-variant", vcf],
    queryFn: () => fetchHg19Variant(vcf),
    enabled: !!vcf,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}