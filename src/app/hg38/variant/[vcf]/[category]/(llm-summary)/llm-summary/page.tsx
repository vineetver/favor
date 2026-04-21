import { VariantLLMSummary } from "@features/variant/components/variant-llm-summary";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

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

  const result = await fetchVariantWithCookie(vcf);
  if (!result) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <VariantLLMSummary variant={result.selected} />
    </div>
  );
}
