import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api/hg38";
import { fetchOpenTargetsVariantEffects } from "@/features/variant/api/opentargets";
import { VariantEffectsTable } from "@/features/variant/components/open-targets/variant-effects-table";

interface VariantEffectsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function VariantEffectsPage({ params }: VariantEffectsPageProps) {
  const { vcf } = await params;

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsVariantEffects(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <VariantEffectsTable data={rows} />;
}
