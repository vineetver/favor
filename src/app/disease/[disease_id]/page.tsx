import { fetchDiseaseEntity } from "@features/disease/api/disease";
import { DiseaseHeader } from "@features/disease/components/disease-header";
import { DiseasePage } from "@features/disease/components/disease-page";
import { notFound } from "next/navigation";

interface DiseasePageProps {
  params: Promise<{
    disease_id: string;
  }>;
}

export default async function DiseasePageRoute({ params }: DiseasePageProps) {
  const { disease_id } = await params;
  const response = await fetchDiseaseEntity(disease_id);

  if (!response?.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <DiseaseHeader disease={response.data} />
        <DiseasePage
          disease={response.data}
          counts={response.included?.counts}
          relations={response.included?.relations}
        />
      </div>
    </div>
  );
}
