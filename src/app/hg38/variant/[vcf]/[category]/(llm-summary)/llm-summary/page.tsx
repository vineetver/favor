import { VariantSummary } from "@features/variant/components/variant-summary";

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
    // <VariantSummary vcf={vcf} />
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Variant LLM Summary</h1>
      <p>Place Holder</p>
    </div>

  )
}
