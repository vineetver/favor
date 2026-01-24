import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchOpenTargetsPharmacogenomics } from "@features/variant/api/opentargets";
import { PharmacogenomicsTable } from "@features/variant/components/open-targets/pharmacogenomics-table";
import { notFound } from "next/navigation";

interface PharmacogenomicsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
  
}

export default async function PharmacogenomicsPage({
  params,
}: PharmacogenomicsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  // Use resolved VCF (handles rsID → VCF conversion)
  const rows = await fetchOpenTargetsPharmacogenomics(result.selected.variant_vcf);

  return <PharmacogenomicsTable data={rows} />;
}
