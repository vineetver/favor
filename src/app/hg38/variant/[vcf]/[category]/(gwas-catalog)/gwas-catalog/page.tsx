import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";

interface GwasCatalogPageProps {
  params: {
    vcf: string;
  };
}

export default async function GwasCatalogPage({
  params,
}: GwasCatalogPageProps) {
  const { vcf } = params;

  const [variant, gwas] = await Promise.all([
    fetchVariant(vcf),
    fetchGWAS(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <GwasCatalogDataDisplay variant={variant} gwas={gwas} />;
}
