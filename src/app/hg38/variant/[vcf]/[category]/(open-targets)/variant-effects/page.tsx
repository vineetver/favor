import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsVariantEffects } from "@features/variant/api/opentargets";
import { PathogenicitySummary } from "@features/variant/components/open-targets/pathogenicity-summary";
import { VariantEffectsTable } from "@features/variant/components/open-targets/variant-effects-table";
import { notFound } from "next/navigation";

interface VariantEffectsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function VariantEffectsPage({
  params,
}: VariantEffectsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsVariantEffects(result.selected.variant_vcf);

  return (
    <div className="space-y-6">
      <PathogenicitySummary data={rows} />
      <VariantEffectsTable data={rows} />
    </div>
  );
}
