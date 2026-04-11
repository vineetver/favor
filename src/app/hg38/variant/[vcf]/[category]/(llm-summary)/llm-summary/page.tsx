import {
  fetchChromBpnetByTissueGroup,
  fetchMethylationByTissueGroup,
  fetchQtlsByTissueGroup,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
  fetchTargetGenes,
  fetchVariantAllelicImbalanceByTissueGroup,
} from "@features/enrichment/api/region";
import { fetchVariantSignals } from "@features/variant/api/credible-sets-graph";
import { fetchGwasAssociations } from "@features/variant/api/gwas";
import { VariantLLMSummary } from "@features/variant/components/variant-llm-summary";
import { buildVariantContext } from "@features/variant/utils/build-variant-context";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

interface VariantLLMSummaryPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function VariantLLMSummaryPage({
  params,
}: VariantLLMSummaryPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) {
    notFound();
  }

  const variant = result.selected;
  const loc = `${variant.chromosome}-${variant.position}-${variant.position}`;

  // Fetch all regulatory context in parallel — failures return null/empty with logging
  const catchNull = (label: string) => (err: unknown) => {
    console.error(`[variant-llm] ${label} failed:`, err);
    return null;
  };
  const catchEmpty = (label: string) => (err: unknown) => {
    console.error(`[variant-llm] ${label} failed:`, err);
    return [] as never[];
  };

  const [
    gwas,
    credibleSets,
    targetGenes,
    qtls,
    regionSummary,
    signals,
    chromBpnet,
    allelicImbalance,
    methylation,
  ] = await Promise.all([
    fetchGwasAssociations(variant.variant_vcf, { limit: 10 }).catch(
      catchNull("gwas"),
    ),
    fetchVariantSignals(variant.variant_vcf, 100).catch(
      catchEmpty("credibleSets"),
    ),
    fetchTargetGenes(variant.variant_vcf, 10).catch(catchEmpty("targetGenes")),
    fetchQtlsByTissueGroup(variant.variant_vcf).catch(catchEmpty("qtls")),
    fetchRegionSummary(loc).catch(catchNull("regionSummary")),
    fetchSignalsByTissueGroup(loc).catch(catchEmpty("signals")),
    fetchChromBpnetByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("chromBpnet"),
    ),
    fetchVariantAllelicImbalanceByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("allelicImbalance"),
    ),
    fetchMethylationByTissueGroup(variant.variant_vcf).catch(
      catchEmpty("methylation"),
    ),
  ]);

  const context = buildVariantContext({
    gwas,
    credibleSets,
    targetGenes,
    qtls,
    regionSummary,
    signals,
    chromBpnet,
    allelicImbalance,
    methylation,
  });

  return (
    <div className="space-y-6">
      <VariantLLMSummary variant={variant} context={context} />
    </div>
  );
}
