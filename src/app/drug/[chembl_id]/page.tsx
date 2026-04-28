import { fetchDrugEntity } from "@features/drug/api/drug";
import { DrugHeader } from "@features/drug/components/drug-header";
import { DrugPage } from "@features/drug/components/drug-page";
import { notFound } from "next/navigation";

interface DrugPageProps {
  params: Promise<{
    chembl_id: string;
  }>;
}

export default async function DrugPageRoute({ params }: DrugPageProps) {
  const { chembl_id } = await params;
  const response = await fetchDrugEntity(chembl_id);

  if (!response?.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12 pb-12">
        <DrugHeader drug={response.data} />
        <DrugPage
          drug={response.data}
          counts={response.included?.counts}
          relations={response.included?.relations}
        />
      </div>
    </div>
  );
}
