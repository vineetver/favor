import { notFound } from "next/navigation";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchVariant } from "@/lib/variant/api";

interface VariantPageProps {
  params: {
    vcf: string;
    category: string;
    subcategory: string;
  };
}

export default async function VariantPage({ params }: VariantPageProps) {
  const { vcf, category, subcategory } = params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  const columns = getVariantColumns(category, subcategory);

  const filteredItems = getFilteredItems(columns!, variant);

  return <AnnotationTable items={filteredItems!} />;
}
