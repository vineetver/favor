import { redirect } from "next/navigation";

interface GeneRedirectProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GeneRedirect({ params }: GeneRedirectProps) {
  const { id } = await params;

  // Redirect to the first category and first subcategory
  // gene-level-annotation -> llm-summary
  redirect(`/hg38/gene/${id}/gene-level-annotation/llm-summary`);
}
