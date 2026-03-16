import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchQtls } from "@features/enrichment/api/region";
import { QtlsView } from "@features/enrichment/components/qtls-view";
import { notFound } from "next/navigation";

interface QtlsPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantQtlsPage({ params }: QtlsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const ref = result.selected.variant_vcf;

  const initialData = await fetchQtls(ref, { limit: 25 }).catch(() => null);

  const genes = initialData
    ? [...new Set(initialData.data.map((r) => r.gene_symbol).filter(Boolean) as string[])].sort()
    : [];

  return (
    <QtlsView
      loc={ref}
      totalCount={initialData?.page_info?.total_count ?? 0}
      genes={genes}
      initialData={initialData ?? undefined}
    />
  );
}
