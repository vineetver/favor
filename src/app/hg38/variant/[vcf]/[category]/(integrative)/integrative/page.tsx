import { fetchVariant } from "@/features/variant/api";
import { CategoryDataView } from "@/features/variant/components/category-data-view";
import { notFound } from "next/navigation";

interface IntegrativePageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function IntegrativePage({
  params,
}: IntegrativePageProps) {
  const { vcf } = await params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <CategoryDataView data={variant} categoryId="integrative" />;
}

