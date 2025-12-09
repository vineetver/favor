import { fetchVariant } from "@/features/variant/api/hg38";
import { CategoryDataView } from "@/features/variant/components/category-data-view";
import { notFound } from "next/navigation";

interface EpigeneticsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function EpigeneticsPage({
  params,
}: EpigeneticsPageProps) {
  const { vcf } = await params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <CategoryDataView data={variant} categoryId="epigenetics" />;
}
