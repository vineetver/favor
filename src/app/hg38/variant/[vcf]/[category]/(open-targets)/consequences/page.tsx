import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api/hg38";
import { fetchOpenTargetsConsequences } from "@/features/variant/api/opentargets";
import { ConsequencesTable } from "@/features/variant/components/open-targets/consequences-table";

interface ConsequencesPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function ConsequencesPage({ params }: ConsequencesPageProps) {
  const { vcf } = await params;

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsConsequences(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <ConsequencesTable data={rows} />;
}
