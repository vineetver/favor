import { resolveGeneId } from "@features/gene/api";
import { notFound, redirect } from "next/navigation";

interface GeneRedirectProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GeneRedirect({ params }: GeneRedirectProps) {
  const { id } = await params;

  const ensemblId = await resolveGeneId(id);
  if (!ensemblId) notFound();

  redirect(`/hg38/gene/${ensemblId}/gene-level-annotation/llm-summary`);
}
