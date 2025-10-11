import { redirect } from "next/navigation";

interface VariantRedirectProps {
  params: {
    vcf: string;
  };
}

export default function VariantRedirect({ params }: VariantRedirectProps) {
  const { vcf } = params;
  redirect(`/hg38/variant/${vcf}/global-annotation/llm-summary`);
}
