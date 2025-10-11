import { redirect } from "next/navigation";

interface GeneRedirectProps {
  params: {
    geneName: string;
  };
}

export default function GeneRedirect({ params }: GeneRedirectProps) {
  const { geneName } = params;
  redirect(`/hg38/gene/${geneName}/gene-level-annotation/llm-summary`);
}
