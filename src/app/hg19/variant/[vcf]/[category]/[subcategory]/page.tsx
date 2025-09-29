import { notFound } from "next/navigation";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchHg19Variant } from "@/lib/hg19/variant/api";
import { fetchAllAnnotations } from "@/lib/hg19/annotations/api";

interface VariantPageProps {
  params: {
    vcf: string;
    category: string;
    subcategory: string;
  };
}

export default async function VariantPage({ params }: VariantPageProps) {
  const { vcf, category, subcategory } = params;

  const variant = await fetchHg19Variant(vcf);

  if (!variant) {
    notFound();
  }

  const annotations = await fetchAllAnnotations([
    { chromosome: variant.chromosome, position: variant.position },
  ]);

  const enrichedVariant = {
    ...variant,
    ...annotations[0],
  };

  console.log("Enriched variant:", enrichedVariant);
  console.log("Recombination rate value:", enrichedVariant.recombination_rate);
  console.log("Category:", category, "Subcategory:", subcategory);
  const columns = getVariantColumns(category, subcategory, "hg19");
  console.log("Columns:", columns);

  const filteredItems = getFilteredItems(columns!, enrichedVariant);
  console.log("Filtered items:", filteredItems);

  return <AnnotationTable items={filteredItems!} />;
}
