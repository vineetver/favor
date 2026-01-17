import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api";
import { EpigeneticsDataTable } from "./epigenetics-data-table";

interface EpigeneticsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function EpigeneticsPage({
  params,
}: EpigeneticsPageProps) {
  const { vcf } = await params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <EpigeneticsDataTable variant={variant} />;
}
