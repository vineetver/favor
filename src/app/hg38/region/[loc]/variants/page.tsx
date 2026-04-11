import { redirect } from "next/navigation";

interface VariantsRedirectProps {
  params: Promise<{ loc: string }>;
}

export default async function VariantsRedirect({
  params,
}: VariantsRedirectProps) {
  const { loc } = await params;
  redirect(`/hg38/region/${loc}/variants/summary-statistics`);
}
