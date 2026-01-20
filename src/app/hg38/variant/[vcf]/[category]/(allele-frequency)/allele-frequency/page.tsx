import { notFound } from "next/navigation";

import { fetchVariant } from "@/features/variant/api";

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

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <AlleleFrequencyDataTable variant={variant} />;
}
