import { fetchDisease } from "@features/disease/api/disease";
import { DiseaseHeader } from "@features/disease/components/header/disease-header";
import { DiseaseOverview } from "@features/disease/components/overview/disease-overview";
import { notFound } from "next/navigation";

interface DiseasePageProps {
  params: Promise<{ disease_id: string }>;
}

export default async function DiseasePage({ params }: DiseasePageProps) {
  const { disease_id } = await params;
  const disease = await fetchDisease(disease_id);

  if (!disease) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <DiseaseHeader disease={disease} />
        <DiseaseOverview disease={disease} />
      </div>
    </div>
  );
}
