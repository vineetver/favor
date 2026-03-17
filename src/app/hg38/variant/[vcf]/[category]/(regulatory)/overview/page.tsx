import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchAccessibilityByTissueGroup,
  fetchAseByTissueGroup,
  fetchChromBpnetByTissueGroup,
  fetchChromatinByTissueGroup,
  fetchEnhancersByTissueGroup,
  fetchLoopsByTissueGroup,
  fetchQtlsByTissueGroup,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
  fetchTargetGenes,
  fetchVariantAllelicImbalanceByTissueGroup,
} from "@features/enrichment/api/region";
import {
  TissueEvidenceSummary,
  type TissueEvidenceData,
} from "@features/enrichment/components/tissue-evidence-summary";
import { TargetGenesView } from "@features/enrichment/components/target-genes-view";
import { notFound } from "next/navigation";

interface OverviewPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantRegulatoryOverviewPage({
  params,
}: OverviewPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const ref = v.variant_vcf;

  const [
    signals,
    chromatin,
    enhancers,
    accessibility,
    loops,
    ase,
    qtls,
    chrombpnet,
    variantAllelicImbalance,
    summary,
    targetGenes,
  ] = await Promise.all([
    fetchSignalsByTissueGroup(loc).catch(() => []),
    fetchChromatinByTissueGroup(loc).catch(() => []),
    fetchEnhancersByTissueGroup(loc).catch(() => []),
    fetchAccessibilityByTissueGroup(loc).catch(() => []),
    fetchLoopsByTissueGroup(loc).catch(() => []),
    fetchAseByTissueGroup(loc).catch(() => []),
    fetchQtlsByTissueGroup(loc).catch(() => []),
    fetchChromBpnetByTissueGroup(loc).catch(() => []),
    fetchVariantAllelicImbalanceByTissueGroup(loc).catch(() => []),
    fetchRegionSummary(loc).catch(() => null),
    fetchTargetGenes(ref, 50).catch(() => []),
  ]);

  const evidence: TissueEvidenceData = {
    signals,
    chromatin,
    enhancers,
    accessibility,
    loops,
    ase,
    qtls,
    chrombpnet,
    variantAllelicImbalance,
  };

  return (
    <div className="space-y-8">
      <section>
        <TissueEvidenceSummary
          evidence={evidence}
          summary={summary}
          basePath={`/hg38/variant/${encodeURIComponent(vcf)}/regulatory`}
        />
      </section>

      <section>
        <TargetGenesView data={targetGenes} variantVcf={ref} />
      </section>
    </div>
  );
}
