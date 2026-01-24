import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsEvidences } from "@features/variant/api/opentargets";
import { EvidencesTable } from "@features/variant/components/open-targets/evidences-table";
import { notFound } from "next/navigation";

interface EvidencesPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function EvidencesPage({ params }: EvidencesPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsEvidences(result.selected.variant_vcf);

  return <EvidencesTable data={rows} />;
}
