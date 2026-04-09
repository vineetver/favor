"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVariantCredibleSets } from "../api/credible-sets-graph";
import { CredibleSetsScatter } from "./credible-sets-scatter";

/**
 * Fetches fine-mapped credible set memberships and renders them as a
 * Set-size × PIP scatter. Purpose-built viz (not the trait scatter) because
 * credible sets want a numeric log x-axis, not category bands.
 */
export function CredibleSetsPlot({ variantVcf }: { variantVcf: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["credible-sets-graph", variantVcf],
    queryFn: () => fetchVariantCredibleSets(variantVcf),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(variantVcf),
  });

  return (
    <CredibleSetsScatter
      points={data ?? []}
      isLoading={isLoading}
      variantLabel={variantVcf}
    />
  );
}
