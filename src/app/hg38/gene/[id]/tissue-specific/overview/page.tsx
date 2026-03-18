import { fetchGene } from "@features/gene/api";
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
    crisprEssentiality,
    summary,
    variantEvidence,
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
    fetchCrisprByTissueGroup(loc).catch(() => []),
    fetchRegionSummary(loc).catch(() => null),
    fetchVariantEvidenceSummary(loc, 50).catch(() => []),
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

      {/* Regulatory Variants — ranked by total evidence */}
      <section>
        <VariantEvidenceView data={variantEvidence} loc={loc} />
      </section>
    </div>
  );
}
