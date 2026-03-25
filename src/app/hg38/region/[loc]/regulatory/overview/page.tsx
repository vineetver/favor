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
  fetchVariantAllelicImbalanceByTissueGroup,
  fetchVariantEvidenceSummary,
} from "@features/enrichment/api/region";
import { fetchCrisprByTissueGroup } from "@features/perturbation/api";
import { VariantEvidenceView } from "@features/enrichment/components/variant-evidence-view";
import {
  TissueEvidenceSummary,
  type TissueEvidenceData,
} from "@features/enrichment/components/tissue-evidence-summary";
import { OverviewHeatmap } from "@features/enrichment/components/overview-heatmap";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface OverviewPageProps {
  params: Promise<{ loc: string }>;
}

export default async function RegionOverviewPage({ params }: OverviewPageProps) {
  const { loc: rawLoc } = await params;
  const loc = decodeURIComponent(rawLoc);
  const region = parseRegion(loc);
  if (!region) notFound();

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
    crisprEssentiality,
    summary,
    variantEvidence,
  ] = await Promise.all([
    fetchSignalsByTissueGroup(region.loc).catch(() => []),
    fetchChromatinByTissueGroup(region.loc).catch(() => []),
    fetchEnhancersByTissueGroup(region.loc).catch(() => []),
    fetchAccessibilityByTissueGroup(region.loc).catch(() => []),
    fetchLoopsByTissueGroup(region.loc).catch(() => []),
    fetchAseByTissueGroup(region.loc).catch(() => []),
    fetchQtlsByTissueGroup(region.loc).catch(() => []),
    fetchChromBpnetByTissueGroup(region.loc).catch(() => []),
    fetchVariantAllelicImbalanceByTissueGroup(region.loc).catch(() => []),
    fetchCrisprByTissueGroup(region.loc).catch(() => []),
    fetchRegionSummary(region.loc).catch(() => null),
    fetchVariantEvidenceSummary(region.loc, 50).catch(() => []),
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
    crisprEssentiality,
  };

  return (
    <div className="space-y-8">
      <section>
        <TissueEvidenceSummary
          evidence={evidence}
          summary={summary}
          basePath={`/hg38/region/${encodeURIComponent(loc)}/regulatory`}
        />
      </section>
      <section>
        <OverviewHeatmap loc={region.loc} />
      </section>
      <section>
        <VariantEvidenceView data={variantEvidence} loc={region.loc} />
      </section>
    </div>
  );
}
