import { fetchGene } from "@features/gene/api";
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

  const response = await fetchGene(id).catch(() => null);
  const gene = response?.data ?? null;

  return (
    <div className="space-y-6">
      <GeneLLMSummary geneId={id} gene={gene} />
    </div>
  );
}
