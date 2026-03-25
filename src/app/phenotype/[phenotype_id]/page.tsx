import { fetchPhenotypeEntity } from "@features/phenotype/api/phenotype";
import { PhenotypeHeader } from "@features/phenotype/components/phenotype-header";
import { PhenotypePage } from "@features/phenotype/components/phenotype-page";
import { notFound } from "next/navigation";

interface PhenotypePageProps {
  params: Promise<{
    phenotype_id: string;
  }>;
}

export default async function PhenotypePageRoute({
  params,
}: PhenotypePageProps) {
  const { phenotype_id } = await params;
  const response = await fetchPhenotypeEntity(phenotype_id);

  if (!response?.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <PhenotypeHeader phenotype={response.data} />
        <PhenotypePage
          phenotype={response.data}
          counts={response.included?.counts}
          relations={response.included?.relations}
        />
      </div>
    </div>
  );
}
