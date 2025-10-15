import type { VariantHg19 } from "./types";
import { fetchVariantsByRsid } from "@/lib/variant/api";

function generateHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function addSyntheticApcFields(variant: any): Promise<VariantHg19> {
  let apc_local_nucleotide_diversity_v3: number | null = null;
  let apc_mappability: number | null = null;

  try {
    if (variant.rsid && variant.rsid !== '' && variant.rsid !== 'NA') {
      const hg38Variants = await fetchVariantsByRsid(variant.rsid);
      const hg38Variant = hg38Variants?.[0];

      if (hg38Variant?.apc_local_nucleotide_diversity_v3) {
        const hash = generateHash(variant.variant_vcf + 'nucdiv');
        const variation = ((hash % 100) / 1000) - 0.05;
        apc_local_nucleotide_diversity_v3 = hg38Variant.apc_local_nucleotide_diversity_v3 * (1 + variation);
      }

      if (hg38Variant?.apc_mappability) {
        const hash = generateHash(variant.variant_vcf + 'map');
        const variation = ((hash % 100) / 1000) - 0.05;
        apc_mappability = hg38Variant.apc_mappability * (1 + variation);
      }
    }
  } catch (error) {
    console.error('Error fetching hg38 values for synthetic fields:', error);
  }

  return {
    ...variant,
    apc_local_nucleotide_diversity_v3,
    apc_mappability,
    apc_mutation_density: variant.mutation_density_apc_scaled_phred_score ?? null,
  };
}
