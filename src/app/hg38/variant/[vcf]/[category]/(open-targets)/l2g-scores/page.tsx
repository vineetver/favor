import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api/hg38";
import { fetchOpenTargetsL2G } from "@/features/variant/api/opentargets";
import { L2GTable } from "@/features/variant/components/open-targets/l2g-table";

interface L2GScoresPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function L2GScoresPage({ params }: L2GScoresPageProps) {
  const { vcf } = await params;

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsL2G(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <L2GTable data={rows} />;
}
