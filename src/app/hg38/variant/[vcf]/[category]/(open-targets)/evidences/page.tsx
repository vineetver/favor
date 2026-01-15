import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api";
import { fetchOpenTargetsEvidences } from "@/features/variant/api/opentargets";
import { EvidencesTable } from "@/features/variant/components/open-targets/evidences-table";

interface EvidencesPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function EvidencesPage({ params }: EvidencesPageProps) {
  const { vcf } = await params;

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsEvidences(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <EvidencesTable data={rows} />;
}
