import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchMethylation } from "@features/enrichment/api/region";
import { MethylationView } from "@features/enrichment/components/methylation-view";
import { notFound } from "next/navigation";

interface MethylationPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantMethylationPage({
  params,
}: MethylationPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const ref = result.selected.variant_vcf;

  const initialData = await fetchMethylation(ref, {
    sort_by: "neglog_pvalue",
    sort_dir: "desc",
    limit: 25,
  }).catch(() => null);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  return (
    <MethylationView
      ref_id={ref}
      tissues={tissues}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
