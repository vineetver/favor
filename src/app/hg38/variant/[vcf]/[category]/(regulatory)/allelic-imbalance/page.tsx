import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchVariantAllelicImbalance } from "@features/enrichment/api/region";
import { AllelicImbalanceView } from "@features/enrichment/components/allelic-imbalance-view";
import { notFound } from "next/navigation";

interface AllelicImbalancePageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantAllelicImbalancePage({
  params,
}: AllelicImbalancePageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const ref = result.selected.variant_vcf;

  const initialData = await fetchVariantAllelicImbalance(ref, {
    sort_by: "neglog_pvalue",
    sort_dir: "desc",
    limit: 25,
  }).catch(() => null);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  const marks = initialData
    ? [...new Set(initialData.data.map((r) => r.mark))].sort()
    : [];

  return (
    <AllelicImbalanceView
      ref_id={ref}
      tissues={tissues}
      marks={marks}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
