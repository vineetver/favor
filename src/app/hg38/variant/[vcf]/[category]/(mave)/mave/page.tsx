import { fetchVariantBands } from "@features/mavedb/api";
import { VariantMaveView } from "@features/mavedb/components/variant-gateway/variant-mave-view";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

interface MavePageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function MaveVariantPage({ params }: MavePageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const variantVcf = result.selected.variant_vcf;
  const initialData = await fetchVariantBands(variantVcf).catch(
    () => [] as Awaited<ReturnType<typeof fetchVariantBands>>,
  );

  return <VariantMaveView vcf={variantVcf} initialData={initialData} />;
}
