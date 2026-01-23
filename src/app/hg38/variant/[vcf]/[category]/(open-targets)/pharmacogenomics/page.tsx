import { notFound } from "next/navigation";
import { fetchVariant } from "@features/variant/api";
import { fetchOpenTargetsPharmacogenomics } from "@features/variant/api/opentargets";
import { PharmacogenomicsTable } from "@features/variant/components/open-targets/pharmacogenomics-table";

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

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsPharmacogenomics(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <PharmacogenomicsTable data={rows} />;
}
