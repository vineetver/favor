import { VariantSummary } from "@/components/features/variant/llm-summary/variant-summary";

interface VariantLLMSummaryPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function VariantLLMSummaryPage({ params }: VariantLLMSummaryPageProps) {
  const { vcf } = params;

  return <VariantSummary vcf={vcf} />;
}
