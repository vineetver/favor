"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVariantTraitAssociations } from "../api/gwas-graph";
import { TraitScatterPlot } from "./trait-scatter-plot";

/**
 * Fetches variant→trait associations from the graph (Entity + Phenotype +
 * Disease edges, all GWAS-Catalog-sourced) and renders them as a category-
 * grouped scatter plot.
 */
export function GwasCatalogPlot({ variantVcf }: { variantVcf: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gwas-trait-graph", variantVcf],
    queryFn: () => fetchVariantTraitAssociations(variantVcf),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(variantVcf),
  });

  return (
    <TraitScatterPlot
      points={data ?? []}
      isLoading={isLoading}
      title="Trait associations"
      variantLabel={variantVcf}
    />
  );
}
