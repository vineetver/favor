import { GeneLLMSummary } from "@features/gene/components/gene-llm-summary";

interface GeneLLMSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GeneLLMSummaryPage({
  params,
}: GeneLLMSummaryPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <GeneLLMSummary geneId={id} />
    </div>
  );
}
