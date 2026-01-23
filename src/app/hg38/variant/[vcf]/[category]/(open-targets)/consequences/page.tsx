import { fetchVariant } from "@features/variant/api";
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

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsConsequences(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ConsequencesSummary data={rows} />
      <ConsequencesTable data={rows} />
    </div>
  );
}
