import { redirect } from "next/navigation";

interface RegulatoryRedirectProps {
  params: Promise<{ loc: string }>;
}

export default async function RegulatoryRedirect({
  params,
}: RegulatoryRedirectProps) {
  const { loc } = await params;
  redirect(`/hg38/region/${loc}/regulatory/overview`);
}
