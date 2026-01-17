import { notFound } from "next/navigation";

import {
  fetchGnomadExome,
  fetchGnomadGenome,
  fetchVariant,
} from "@/features/variant/api";

import { AlleleFrequencyDataTable } from "./allele-frequency-data-table";

interface AlleleFrequencyPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function AlleleFrequencyPage({
  params,
}: AlleleFrequencyPageProps) {
  const { vcf } = await params;

  const [variant, gnomadExome, gnomadGenome] = await Promise.all([
    fetchVariant(vcf),
    fetchGnomadExome(vcf),
    fetchGnomadGenome(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  // Merge gnomAD data into variant
  variant.gnomad_exome = gnomadExome;
  variant.gnomad_genome = gnomadGenome;

  return <AlleleFrequencyDataTable variant={variant} />;
}
