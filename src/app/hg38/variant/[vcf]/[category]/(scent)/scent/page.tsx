import { notFound } from "next/navigation";
import { ScentDisplay } from "@/components/features/variant/scent/scent-display";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";

interface ScentPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function ScentPage({ params }: ScentPageProps) {
  const { vcf, category } = params;

  if (category !== "single-cell-tissue") {
    notFound();
  }

  const initialData = await fetchScentTissueByVCF(vcf, 0);

  return <ScentDisplay vcf={vcf} initialData={initialData} />;
}
