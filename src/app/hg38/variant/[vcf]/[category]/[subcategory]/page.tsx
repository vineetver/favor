import {
  fetchVariant,
  fetchGnomadExome,
  fetchGnomadGenome,
} from "@/features/variant/api/hg38";
import { VariantCategoryView } from "@/features/variant/components/variant-category-view";
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

  const [variant, gnomadExome, gnomadGenome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  // Merge gnomAD data into variant
  variant.gnomad_exome = gnomadExome;
  variant.gnomad_genome = gnomadGenome;

  return <VariantCategoryView data={variant} categoryId={subcategory} />;
}
