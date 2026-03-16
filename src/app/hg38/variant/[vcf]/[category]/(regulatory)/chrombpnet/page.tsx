import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchChromBpnet } from "@features/enrichment/api/region";
import { ChromBpnetView } from "@features/enrichment/components/chrombpnet-view";
import { notFound } from "next/navigation";

interface ChromBpnetPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantChromBpnetPage({
  params,
}: ChromBpnetPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const ref = result.selected.variant_vcf;

  const initialData = await fetchChromBpnet(ref, { limit: 25 }).catch(
    () => null,
  );

  return (
    <ChromBpnetView
      loc={ref}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
