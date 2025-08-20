import { notFound } from "next/navigation";
import { PGBoostTable } from "@/components/features/variant/pgboost/pgboost-display";
import { fetchVariant } from "@/lib/variant/api";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";

interface PGBoostPageProps {
  params: {
    vcf: string;
  };
}

export default async function PGBoostPage({ params }: PGBoostPageProps) {
  const { vcf } = params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  const pgboostData = variant.rsid ? await fetchPGBoost(variant.rsid) : null;

  const hasValidData = (data: any[]): boolean => {
    return data.some(row => 
      row && 
      row.gene && 
      row.pg_boost != null && 
      row.pg_boost !== -1 && 
      row.pg_boost !== 1e-100 &&
      row.pg_boost_percentile != null
    );
  };

  const filteredData = pgboostData && hasValidData(pgboostData) ? pgboostData : [];

  return (
    <PGBoostTable
      data={filteredData}
      title="PGBoost Variant-Gene Link Predictions"
      description="Gradient boosting model predictions for variant-gene associations using single-cell ATAC peak-gene linking scores"
    />
  );
}
