import { VariantSummary } from "@/features/variant/components/variant-summary";

interface VariantLLMSummaryPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function VariantLLMSummaryPage({
  params,
}: VariantLLMSummaryPageProps) {
  const { vcf } = await params;

  return <VariantSummary vcf={vcf} />;
}
