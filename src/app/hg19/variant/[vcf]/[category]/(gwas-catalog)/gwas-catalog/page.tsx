import { notFound } from "next/navigation";
import { fetchHg19Variant } from "@/lib/hg19/variant/api";
import { fetchGWAS } from "@/lib/variant/gwas/api";
import { GwasCatalogDataDisplay } from "@/components/features/variant/gwas/gwas-catalog-display";

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
    fetchHg19Variant(vcf),
    fetchGWAS(vcf),
  ]);

  if (!variant) {
    notFound();
  }

  return <GwasCatalogDataDisplay variant={variant} gwas={gwas} />;
}
