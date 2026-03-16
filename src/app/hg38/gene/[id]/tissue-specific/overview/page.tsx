import { fetchGene } from "@features/gene/api";
import {
  fetchAccessibilityByTissueGroup,
  fetchAseByTissueGroup,
  fetchChromBpnetByTissue,
  fetchChromatinByTissueGroup,
  fetchEnhancersByTissueGroup,
  fetchLoopsByTissueGroup,
  fetchQtlsByTissue,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
  fetchVariantAllelicImbalanceByTissue,
  fetchVariantScan,
} from "@features/gene/api/region";
import { GeneVariantsView } from "@features/gene/components/tissue-specific/gene-variants-view";
import {
  TissueEvidenceSummary,
  type TissueEvidenceData,
} from "@features/gene/components/tissue-specific/tissue-evidence-summary";
import { OverviewHeatmap } from "@features/gene/components/tissue-specific/overview-heatmap";
import { notFound } from "next/navigation";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function TissueOverviewPage({
  params,
}: OverviewPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

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
    variantScan,
  ] = await Promise.all([
    fetchSignalsByTissueGroup(loc).catch(() => []),
    fetchChromatinByTissueGroup(loc).catch(() => []),
    fetchEnhancersByTissueGroup(loc).catch(() => []),
    fetchAccessibilityByTissueGroup(loc).catch(() => []),
    fetchLoopsByTissueGroup(loc).catch(() => []),
    fetchAseByTissueGroup(loc).catch(() => []),
    fetchQtlsByTissue(loc).catch(() => []),
    fetchChromBpnetByTissue(loc).catch(() => []),
    fetchVariantAllelicImbalanceByTissue(loc).catch(() => []),
    fetchRegionSummary(loc).catch(() => null),
    fetchVariantScan({ gene: loc, limit: 25 }).catch(() => null),
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
      {/* Hero: Tissue Evidence Table */}
      <section>
        <TissueEvidenceSummary
          evidence={evidence}
          summary={summary}
          basePath={`/hg38/gene/${encodeURIComponent(id)}/tissue-specific`}
        />
      </section>

      {/* Signal Heatmap: cCRE activity across tissues */}
      <section>
        <OverviewHeatmap loc={loc} />
      </section>

      {/* Gene Region Variants */}
      <section>
        <GeneVariantsView
          gene={loc}
          initialData={variantScan}
        />
      </section>
    </div>
  );
}
