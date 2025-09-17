import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTargetDiseases } from "@/lib/opentargets/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { TargetDiseasesDisplay } from "@/components/features/opentargets/target-diseases-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DiseasesPageProps {
  params: {
    geneName: string;
  };
}

async function DiseasesContent({ geneName }: { geneName: string }) {
  const geneData = await fetchGeneAnnotation(geneName);

  if (!geneData?.ensembl_gene) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Ensembl Gene ID not found for {geneName} found{" "}
          {geneData?.ensembl_gene}
        </p>
      </div>
    );
  }

  try {
    const { target } = await getTargetDiseases(geneData.ensembl_gene);

    return <TargetDiseasesDisplay target={target} geneName={geneName} />;
  } catch (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Failed to load disease associations from OpenTarget using{" "}
          {geneData.ensembl_gene}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
}

export default async function DiseasesPage({ params }: DiseasesPageProps) {
  const { geneName } = params;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DiseasesContent geneName={geneName} />
    </Suspense>
  );
}
