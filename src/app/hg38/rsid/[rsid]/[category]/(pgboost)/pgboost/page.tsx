import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PGBoostTable } from "@/components/features/variant/pgboost/pgboost-display";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";

interface PGBoostRsidPageProps {
  params: {
    rsid: string;
  };
}

export default async function PGBoostRsidPage({
  params,
}: PGBoostRsidPageProps) {
  const { rsid } = params;

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

  const variant = selectedVariant;

  const pgboostData = variant.rsid ? await fetchPGBoost(variant.rsid) : null;

  const hasValidData = (data: any[]): boolean => {
    return data.some(
      (row) =>
        row &&
        row.gene &&
        row.pg_boost != null &&
        row.pg_boost !== -1 &&
        row.pg_boost !== 1e-100 &&
        row.pg_boost_percentile != null,
    );
  };

  const filteredData =
    pgboostData && hasValidData(pgboostData) ? pgboostData : [];

  return (
    <PGBoostTable
      data={filteredData}
      title="PGBoost Variant-Gene Link Predictions"
      description="Gradient boosting model predictions for variant-gene associations using single-cell ATAC peak-gene linking scores"
    />
  );
}
