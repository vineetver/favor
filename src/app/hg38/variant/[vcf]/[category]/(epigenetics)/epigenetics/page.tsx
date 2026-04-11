import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";
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

  const result = await fetchVariantWithCookie(vcf);

  if (!result) {
    notFound();
  }

  return <EpigeneticsDataTable variant={result.selected} />;
}
