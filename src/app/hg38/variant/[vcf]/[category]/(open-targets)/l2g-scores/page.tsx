import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsL2G } from "@features/variant/api/opentargets";
import { L2GTable } from "@features/variant/components/open-targets/l2g-table";
import { notFound } from "next/navigation";

interface L2GScoresPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function L2GScoresPage({ params }: L2GScoresPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsL2G(result.selected.variant_vcf);

  return <L2GTable data={rows} />;
}
