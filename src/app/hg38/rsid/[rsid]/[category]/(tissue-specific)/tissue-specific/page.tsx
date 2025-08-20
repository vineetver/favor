import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import { getCCREByVCF } from "@/lib/variant/ccre/api";
import { fetchABCScores, fetchABCPeaks } from "@/lib/variant/abc/api";
import { fetchEntexDefault } from "@/lib/variant/entex/api";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { processTissueSpecificData } from "@/lib/variant/tissue/helpers";

interface TissueSpecificPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function TissueSpecificPage({ params }: TissueSpecificPageProps) {
  const { rsid, category } = params;

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const variants = await fetchVariantsByRsid(rsid);

  if (!variants || variants.length === 0) {
    notFound();
  }

  const validatedVariantVcf = validateVariantForRsid(
    variants,
    selectedVariantVcfFromCookie,
  );
  const selectedVariant = selectVariantFromList(
    variants,
    validatedVariantVcf || undefined,
  );

  if (!selectedVariant) {
    notFound();
  }

  const [ccreElements, abcScores, abcPeaks, entexData, scentData, pgboostData] = await Promise.all([
    getCCREByVCF(selectedVariant.variant_vcf).catch(() => []),
    fetchABCScores(selectedVariant.variant_vcf).catch(() => []),
    fetchABCPeaks(selectedVariant.variant_vcf).catch(() => []),
    fetchEntexDefault(selectedVariant.variant_vcf).catch(() => []),
    fetchScentTissueByVCF(selectedVariant.variant_vcf).catch(() => []),
    fetchPGBoost(rsid).catch(() => []), // PGBoost uses RSID directly
  ]);

  const processedTissueData = processTissueSpecificData(
    selectedVariant,
    ccreElements || [],
    [], // Skip CCRE tissue data for now since it requires tissue selection
    abcScores || [],
    abcPeaks || [],
    entexData || [],
    scentData || [],
    pgboostData || [],
  );

  const enrichedVariant = {
    ...selectedVariant,
    ...processedTissueData,
  };

  const columns = getVariantColumns(category, "tissue-specific");
  const filteredItems = getFilteredItems(columns!, enrichedVariant);

  const validItems = filteredItems || [];

  return (
    <div className="space-y-6">
      <AnnotationTable items={validItems} />
    </div>
  );
}