import { redirect } from "next/navigation";

interface VariantRedirectProps {
  params: Promise<{
    vcf: string;
  }>;
  searchParams: Promise<{ allele?: string }>;
}

export default async function VariantRedirect({
  params,
  searchParams,
}: VariantRedirectProps) {
  const { vcf } = await params;
  const { allele } = await searchParams;
  
  // Preserve ?allele param when redirecting
  const queryString = allele ? `?allele=${encodeURIComponent(allele)}` : "";
  redirect(`/hg38/variant/${vcf}/global-annotation/llm-summary${queryString}`);
}
