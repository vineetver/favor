import { fetchGwasAssociations } from "../api/gwas";
import { fetchVariantGraph } from "../api/variant-graph";

/**
 * Tabs whose data lives in separate API endpoints (graph edges or GWAS
 * catalog) rather than on the Variant payload itself. The static
 * `variantDataChecks` map can't tell whether they're empty for a given
 * variant — so the layout calls this to fetch availability counts and
 * pass empty tabs into `disabledSlugs`.
 *
 * Two parallel network calls:
 *   1. fetchVariantGraph(vcf, [edge types needed by the four tabs], limit=1)
 *      — response includes per-edge-type counts; rows themselves discarded.
 *   2. fetchGwasAssociations(vcf, limit=1) — meta.totalCount.
 *
 * limit=1 keeps payloads tiny; the tab pages re-fetch with their full
 * limits when the user actually navigates.
 */
export async function fetchTabAvailability(vcf: string): Promise<string[]> {
  if (!vcf) return [];

  const [graph, gwas] = await Promise.all([
    fetchVariantGraph(
      vcf,
      [
        "SIGNAL_HAS_VARIANT", // credible-sets
        "VARIANT_IMPLIES_GENE", // l2g-scores
        "VARIANT_ASSOCIATED_WITH_DRUG", // pharmacogenomics
        "VARIANT_LINKED_TO_SIDE_EFFECT", // pharmacogenomics
      ],
      1,
    ).catch(() => null),
    fetchGwasAssociations(vcf, { limit: 1 }).catch(() => null),
  ]);

  const disabled: string[] = [];

  const counts = graph?.included?.counts ?? {};
  if (!(counts.SIGNAL_HAS_VARIANT > 0)) disabled.push("credible-sets");
  if (!(counts.VARIANT_IMPLIES_GENE > 0)) disabled.push("l2g-scores");
  if (
    !(counts.VARIANT_ASSOCIATED_WITH_DRUG > 0) &&
    !(counts.VARIANT_LINKED_TO_SIDE_EFFECT > 0)
  ) {
    disabled.push("pharmacogenomics");
  }

  const gwasCount = gwas?.meta?.totalCount ?? gwas?.data?.length ?? 0;
  if (gwasCount === 0) disabled.push("gwas-catalog");

  return disabled;
}
