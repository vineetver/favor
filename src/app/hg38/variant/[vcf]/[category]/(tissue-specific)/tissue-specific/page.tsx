import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";
import { getCCREByVCF } from "@/lib/variant/ccre/api";
import { fetchABCScores, fetchABCPeaks } from "@/lib/variant/abc/api";
import { fetchEntexDefault } from "@/lib/variant/entex/api";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";

import { getVariantColumns } from "@/lib/variant/columns";
import { processTissueSpecificData } from "@/lib/variant/tissue/helpers";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { AnnotationTable } from "@/components/data-display/annotation-table";

interface TissueSpecificPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function TissueSpecificPage({
  params,
}: TissueSpecificPageProps) {
  const { vcf, category } = params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  // Fetch all tissue-specific data sources in parallel (excluding GWAS - not tissue-specific)
  const [ccreData, abcScores, abcPeaks, entexData, scentData, pgboostData] =
    await Promise.allSettled([
      getCCREByVCF(vcf, 0).then((data) => data || []),
      fetchABCScores(vcf).then((data) => data || []),
      fetchABCPeaks(vcf).then((data) => data || []),
      fetchEntexDefault(vcf).then((data) => data || []),
      fetchScentTissueByVCF(vcf, 0).then((data) => data || []),
      variant.rsid
        ? fetchPGBoost(variant.rsid).then((data) => data || [])
        : Promise.resolve([]),
    ]);

  // Extract resolved values, defaulting to empty arrays for rejected promises
  const tissueData = {
    ccre: ccreData.status === "fulfilled" ? ccreData.value : [],
    abcScores: abcScores.status === "fulfilled" ? abcScores.value : [],
    abcPeaks: abcPeaks.status === "fulfilled" ? abcPeaks.value : [],
    entex: entexData.status === "fulfilled" ? entexData.value : [],
    scent: scentData.status === "fulfilled" ? scentData.value : [],
    pgboost: pgboostData.status === "fulfilled" ? pgboostData.value : [],
  };

  const processedTissueData = processTissueSpecificData(
    variant,
    tissueData.ccre,
    [],
    tissueData.abcScores,
    tissueData.abcPeaks,
    tissueData.entex,
    tissueData.scent,
    tissueData.pgboost,
  );

  const enrichedVariant = {
    ...variant,
    ...processedTissueData,
  };

  const columns = getVariantColumns(category, "tissue-specific");
  if (!columns) {
    notFound();
  }

  const filteredItems = getFilteredItems(columns, enrichedVariant);
  const validItems = filteredItems || [];

  return (
    <div className="space-y-6">
      <AnnotationTable items={validItems} />
    </div>
  );
}
