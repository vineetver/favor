import { notFound } from "next/navigation";
import { fetchVariant } from "@features/variant/api";
import { fetchOpenTargetsCredibleSets } from "@features/variant/api/opentargets";
import { CredibleSetsTable } from "@features/variant/components/open-targets/credible-sets-table";

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

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsCredibleSets(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <CredibleSetsTable data={rows} />;
}
