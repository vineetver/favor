import { notFound } from "next/navigation";
import { MaleDataDisplay } from "@/components/features/variant/gender/male-display";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";

interface GenderAfMalePageProps {
  params: {
    vcf: string;
  };
}

export default async function GenderAfMalePage({
  params,
}: GenderAfMalePageProps) {
  const { vcf } = params;

  const [variant, exome, genome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <MaleDataDisplay variant={variant} exome={exome} genome={genome} />;
}
