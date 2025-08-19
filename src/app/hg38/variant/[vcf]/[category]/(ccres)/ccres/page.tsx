import { notFound } from "next/navigation";
import { CCREDisplay } from "@/components/features/browser/ccre/ccre-display";
import { getCCREByVCF } from "@/lib/variant/ccre/api";

interface CCREPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function CCREPage({ params }: CCREPageProps) {
  const { vcf, category } = params;

  if (category !== "single-cell-tissue") {
    notFound();
  }

  const initialData = await getCCREByVCF(vcf, 0);

  return (
      <CCREDisplay
        vcf={vcf}
        initialData={initialData}
      />
  );
}
