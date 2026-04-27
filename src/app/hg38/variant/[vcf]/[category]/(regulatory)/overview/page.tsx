import {
  fetchAccessibilityByTissueGroup,
  fetchAseByTissueGroup,
  fetchChromatinByTissueGroup,
  fetchChromBpnetByTissueGroup,
  fetchEnhancersByTissueGroup,
  fetchLoopsByTissueGroup,
  fetchQtlsByTissueGroup,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
  fetchTargetGenes,
  fetchVariantAllelicImbalanceByTissueGroup,
} from "@features/enrichment/api/region";
import { TargetGenesView } from "@features/enrichment/components/target-genes-view";
import { resolveGeneIds } from "@features/gene/api";
import {
  type TissueEvidenceData,
  TissueEvidenceSummary,
} from "@features/enrichment/components/tissue-evidence-summary";
import { fetchCrisprByTissueGroup } from "@features/perturbation/api";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
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
  const loc = `${v.chromosome}-${v.position}-${v.position}`;
  const ref = v.variant_vcf;

  const catchNull = (label: string) => (err: unknown) => {
    console.error(`[variant-regulatory] ${label} failed:`, err);
    return null;
  };
  const catchEmpty = (label: string) => (err: unknown) => {
    console.error(`[variant-regulatory] ${label} failed:`, err);
    return [] as never[];
  };

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
    targetGenes,
  ] = await Promise.all([
    fetchSignalsByTissueGroup(loc).catch(catchEmpty("signals")),
    fetchChromatinByTissueGroup(loc).catch(catchEmpty("chromatin")),
    fetchEnhancersByTissueGroup(loc).catch(catchEmpty("enhancers")),
    fetchAccessibilityByTissueGroup(loc).catch(catchEmpty("accessibility")),
    fetchLoopsByTissueGroup(loc).catch(catchEmpty("loops")),
    fetchAseByTissueGroup(loc).catch(catchEmpty("ase")),
    fetchQtlsByTissueGroup(loc).catch(catchEmpty("qtls")),
    fetchChromBpnetByTissueGroup(loc).catch(catchEmpty("chrombpnet")),
    fetchVariantAllelicImbalanceByTissueGroup(loc).catch(
      catchEmpty("allelicImbalance"),
    ),
    fetchCrisprByTissueGroup(loc).catch(catchEmpty("crispr")),
    fetchRegionSummary(loc).catch(catchNull("regionSummary")),
    fetchTargetGenes(ref, 50).catch(catchEmpty("targetGenes")),
  ]);

  const geneIdMap = targetGenes.length
    ? await resolveGeneIds(targetGenes.map((g) => g.gene_symbol))
    : new Map<string, string>();

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
          basePath={`/hg38/variant/${encodeURIComponent(vcf)}/regulatory`}
        />
      </section>

      <section>
        <TargetGenesView
          data={targetGenes}
          variantVcf={ref}
          geneIdMap={Object.fromEntries(geneIdMap.entries())}
        />
      </section>
    </div>
  );
}
