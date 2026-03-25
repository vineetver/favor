import { fetchCcreEntity } from "@features/ccre/api/ccre";
import { CcreHeader } from "@features/ccre/components/ccre-header";
import { CcrePage } from "@features/ccre/components/ccre-page";
import { notFound } from "next/navigation";

interface CcrePageProps {
  params: Promise<{
    ccre_id: string;
  }>;
}

export default async function CcrePageRoute({ params }: CcrePageProps) {
  const { ccre_id } = await params;
  const response = await fetchCcreEntity(ccre_id);

  if (!response?.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <CcreHeader
          ccre={response.data}
          counts={response.included?.counts}
        />
        <CcrePage
          ccre={response.data}
          counts={response.included?.counts}
          relations={response.included?.relations}
        />
      </div>
    </div>
  );
}
