import { notFound } from "next/navigation";
import { AncestryDisplay } from "@/components/features/variant/ancestry/ancestry-display";
import { fetchHg19Variant } from "@/lib/hg19/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";

interface AncestryAfPageProps {
  params: {
    vcf: string;
  };
}

export default async function AncestryAfPage({ params }: AncestryAfPageProps) {
  const { vcf } = params;

  const [variant, exome, genome] = await Promise.all([
    fetchHg19Variant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <AncestryDisplay variant={variant} exome={exome} genome={genome} />;
}
