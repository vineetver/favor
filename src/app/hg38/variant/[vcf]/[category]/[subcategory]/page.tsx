import { notFound } from "next/navigation";
import {
  fetchGnomadExome,
  fetchGnomadGenome,
  fetchVariant,
} from "@features/variant/api";
import { CategoryDetailView } from "@features/variant/components/category-detail-view";

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

  return <CategoryDetailView data={variant} categoryId={subcategory} />;
}
