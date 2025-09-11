import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTargetTractability } from "@/lib/opentargets/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { TargetTractabilityDisplay } from "@/components/features/opentargets/target-tractability-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TractabilityPageProps {
  params: {
    geneName: string;
  };
}

async function TractabilityContent({ geneName }: { geneName: string }) {
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
    const { target } = await getTargetTractability(geneData.ensembl_gene);
    
    return (
      <TargetTractabilityDisplay 
        target={target} 
        geneName={geneName}
      />
    );
  } catch (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Failed to load tractability data from OpenTargets
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
}

export default async function TractabilityPage({ params }: TractabilityPageProps) {
  const { geneName } = params;

  return (
      <Suspense fallback={<LoadingSpinner />}>
        <TractabilityContent geneName={geneName} />
      </Suspense>
  );
}