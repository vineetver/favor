import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

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
  

  const result = await fetchVariantWithCookie(vcf);

  if (!result) {
    notFound();
  }

  return <AlleleFrequencyDataTable variant={result.selected} />;
}
