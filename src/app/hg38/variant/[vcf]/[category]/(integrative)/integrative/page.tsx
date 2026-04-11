import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";
import { IntegrativeDataTable } from "./integrative-data-table";

interface IntegrativePageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function IntegrativePage({
  params,
}: IntegrativePageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);

  if (!result) {
    notFound();
  }

  return <IntegrativeDataTable variant={result.selected} />;
}
