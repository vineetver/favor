import { fetchVariantSignals } from "@features/variant/api/credible-sets-graph";
import { CredibleSetsPlot } from "@features/variant/components/credible-sets-plot";
import type { CredibleSetRow } from "@features/variant/components/graph/credible-sets-table";
import { CredibleSetsTable } from "@features/variant/components/graph/credible-sets-table";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

interface CredibleSetsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

const STUDY_TYPE_LABELS: Record<string, string> = {
  gwas: "GWAS",
  eqtl: "eQTL",
  pqtl: "pQTL",
  sqtl: "sQTL",
  tuqtl: "tuQTL",
  sceqtl: "sc-eQTL",
};

export default async function CredibleSetsPage({
  params,
}: CredibleSetsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const variantVcf = result.selected.variant_vcf;

  const signals = await fetchVariantSignals(variantVcf);

  const rows: CredibleSetRow[] = signals.map((s) => ({
    id: s.signalId,
    signalId: s.signalId,
    studyId: s.studyId,
    studyType: s.studyType,
    studyTypeLabel: STUDY_TYPE_LABELS[s.studyType] ?? s.studyType,
    reportedTrait: s.reportedTrait,
    methodName: s.methodName,
    numCredible95: s.numCredible95,
    numVariants: s.numVariants,
    region: s.region,
    logBayesFactor: s.logBayesFactor,
    posteriorProbability: s.posteriorProbability,
    confidence: s.confidence,
    isLead: s.isLead,
  }));

  // Sort by PIP desc, tiebreak on log BF (many high-PIP leads share PIP≈1.0)
  rows.sort((a, b) => {
    const pa = a.posteriorProbability ?? -Infinity;
    const pb = b.posteriorProbability ?? -Infinity;
    if (pb !== pa) return pb - pa;
    return (b.logBayesFactor ?? -Infinity) - (a.logBayesFactor ?? -Infinity);
  });

  return (
    <div className="space-y-4">
      <CredibleSetsPlot variantVcf={variantVcf} />
      <CredibleSetsTable data={rows} />
    </div>
  );
}
