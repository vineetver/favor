import { fetchVariant } from "@/features/variant/api/hg38";
import { CategoryTableView } from "@/features/variant/components/category-table-view";
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

  return <CategoryTableView data={variant} categoryId="integrative" />;
}
