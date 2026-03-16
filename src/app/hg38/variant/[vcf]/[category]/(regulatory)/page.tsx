import { redirect } from "next/navigation";

interface RegulatoryPageProps {
  params: Promise<{ vcf: string; category: string }>;
}

export default async function RegulatoryPage({ params }: RegulatoryPageProps) {
  const { vcf } = await params;
  redirect(`/hg38/variant/${encodeURIComponent(vcf)}/regulatory/overview`);
}
