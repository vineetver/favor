import { fetchVariant } from "@/features/variant/api/hg38";
import { VariantHeader } from "@/features/variant/components/header/variant-header";
import { AnnotationTable } from "@/features/variant/components/annotation-table";
import { variantDetailedColumns } from "@/features/variant/config/hg38";
import { enrichData } from "@/lib/data-display/enricher";
import { notFound } from "next/navigation";

interface VariantPageProps {
  params: {
    vcf: string;
    category: string;
    subcategory: string;
  };
}

export default async function VariantPage({ params }: VariantPageProps) {
  const { vcf, category, subcategory } = await params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  const enrichedVariant = enrichData(variant, variantDetailedColumns);

  return (
    <div className="space-y-6">
      <AnnotationTable
        enrichedData={enrichedVariant}
        category={category}
        subcategory={subcategory}
      />
    </div>
  );
}
