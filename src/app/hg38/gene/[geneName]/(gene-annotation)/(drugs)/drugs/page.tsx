import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTargetDrugs } from "@/lib/opentargets/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { TargetDrugsDisplay } from "@/components/features/opentargets/target-drugs-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DrugsPageProps {
  params: {
    geneName: string;
  };
}

async function DrugsContent({ geneName }: { geneName: string }) {
  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData?.ensembl_gene) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Ensembl Gene ID not found for {geneName}
        </p>
      </div>
    );
  }

  try {
    const { target } = await getTargetDrugs(geneData.ensembl_gene);
    
    return (
      <TargetDrugsDisplay 
        target={target} 
        geneName={geneName}
      />
    );
  } catch (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Failed to load drug information from OpenTargets
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
}

export default async function DrugsPage({ params }: DrugsPageProps) {
  const { geneName } = params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Known Drugs
        </h1>
        <p className="text-muted-foreground mt-2">
          Drug-target interactions for {geneName} from OpenTargets Platform
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <DrugsContent geneName={geneName} />
      </Suspense>
    </div>
  );
}