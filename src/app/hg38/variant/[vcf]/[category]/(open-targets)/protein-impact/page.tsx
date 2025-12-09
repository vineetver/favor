import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api/hg38";
import { fetchOpenTargetsProteinCoding } from "@/features/variant/api/opentargets";
import { ProteinCodingTable } from "@/features/variant/components/open-targets/protein-coding-table";

interface ProteinImpactPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function ProteinImpactPage({ params }: ProteinImpactPageProps) {
  const { vcf } = await params;

  const [variant, rows] = await Promise.all([
    fetchVariant(vcf),
    fetchOpenTargetsProteinCoding(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <ProteinCodingTable data={rows} />;
}
