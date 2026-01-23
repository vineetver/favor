import { notFound } from "next/navigation";
import { fetchVariant } from "@features/variant/api";
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

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <IntegrativeDataTable variant={variant} />;
}
