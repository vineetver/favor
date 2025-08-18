import { notFound } from "next/navigation";
import { FemaleDataDisplay } from "@/components/features/variant/gender/female-display";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";

interface GenderAfFemalePageProps {
  params: {
    vcf: string;
  };
}

export default async function GenderAfFemalePage({
  params,
}: GenderAfFemalePageProps) {
  const { vcf } = params;

  const [variant, exome, genome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <FemaleDataDisplay variant={variant} exome={exome} genome={genome} />;
}
