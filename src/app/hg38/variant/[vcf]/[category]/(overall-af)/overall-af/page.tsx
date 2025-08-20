import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import { getVariantColumns } from "@/lib/variant/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { AnnotationTable } from "@/components/data-display/annotation-table";

interface OverallAfPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function OverallAfPage({ params }: OverallAfPageProps) {
  const { vcf, category } = params;

  const [variant, exome, genome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  variant.gnomad41_genome = genome?.af;
  variant.gnomad41_exome = exome?.af;
  const columns = getVariantColumns(category, "overall-af");
  const filteredItems = getFilteredItems(columns!, variant);

  const validItems = filteredItems || [];

  return (
      <AnnotationTable items={validItems} />
  );
}
