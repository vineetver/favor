import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTargetSafety } from "@/lib/opentargets/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { TargetSafetyDisplay } from "@/components/features/opentargets/target-safety-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SafetyPageProps {
  params: {
    geneName: string;
  };
}

async function SafetyContent({ geneName }: { geneName: string }) {
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
    const { target } = await getTargetSafety(geneData.ensembl_gene);

    return <TargetSafetyDisplay target={target} geneName={geneName} />;
  } catch (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Failed to load safety data from OpenTargets
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
}

export default async function SafetyPage({ params }: SafetyPageProps) {
  const { geneName } = params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Safety Information
        </h1>
        <p className="text-muted-foreground mt-2">
          Safety liabilities and adverse events for {geneName} from OpenTargets
          Platform
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <SafetyContent geneName={geneName} />
      </Suspense>
    </div>
  );
}
