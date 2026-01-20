import { notFound } from "next/navigation";
import { DrugHeader, DrugOverview, fetchDrug } from "@/features/drug";

interface DrugPageProps {
  params: Promise<{
    chembl_id: string;
  }>;
}

export default async function DrugPage({ params }: DrugPageProps) {
  const resolvedParams = await params;
  const drug = await fetchDrug(resolvedParams.chembl_id);

  if (!drug) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <DrugHeader drug={drug} />
        <DrugOverview drug={drug} />
      </div>
    </div>
  );
}
