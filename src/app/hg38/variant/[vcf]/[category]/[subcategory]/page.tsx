import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { CategoryDetailView } from "@shared/components/ui/category-detail-view";
import { notFound } from "next/navigation";

interface VariantPageProps {
  params: Promise<{
    vcf: string;
    category: string;
    subcategory: string;
  }>;
}

export default async function VariantPage({ params }: VariantPageProps) {
  const { vcf, subcategory } = await params;

  const result = await fetchVariantWithCookie(vcf);

  if (!result) {
    notFound();
  }

  return (
    <CategoryDetailView
      data={result.selected}
      categoryId={subcategory}
      columnGroupSource="variant"
    />
  );
}
