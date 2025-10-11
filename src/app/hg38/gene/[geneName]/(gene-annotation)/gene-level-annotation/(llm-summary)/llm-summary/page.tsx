import { GeneSummary } from "@/components/features/gene/llm-summary/gene-summary";

interface LLMSummaryPageProps {
  params: {
    geneName: string;
  };
}

export default async function LLMSummaryPage({ params }: LLMSummaryPageProps) {
  const { geneName } = params;

  return <GeneSummary symbol={geneName} />;
}
