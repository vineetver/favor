import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsCredibleSets } from "@features/variant/api/opentargets";
import { CredibleSetsTable } from "@features/variant/components/open-targets/credible-sets-table";
import { notFound } from "next/navigation";

interface CredibleSetsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function CredibleSetsPage({
  params,
}: CredibleSetsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsCredibleSets(result.selected.variant_vcf);

  return <CredibleSetsTable data={rows} />;
}
