import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsConsequences } from "@features/variant/api/opentargets";
import { ConsequencesSummary } from "@features/variant/components/open-targets/consequences-summary";
import { ConsequencesTable } from "@features/variant/components/open-targets/consequences-table";
import { notFound } from "next/navigation";

interface ConsequencesPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function ConsequencesPage({
  params,
}: ConsequencesPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsConsequences(result.selected.variant_vcf);

  return (
    <div className="space-y-6">
      <ConsequencesSummary data={rows} />
      <ConsequencesTable data={rows} />
    </div>
  );
}
