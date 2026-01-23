import { redirect } from "next/navigation";

interface VariantRedirectProps {
  params: Promise<{
    vcf: string;
  }>;
}

export default async function VariantRedirect({
  params,
}: VariantRedirectProps) {
  const { vcf } = await params;
  redirect(`/hg38/variant/${vcf}/global-annotation/llm-summary`);
}
