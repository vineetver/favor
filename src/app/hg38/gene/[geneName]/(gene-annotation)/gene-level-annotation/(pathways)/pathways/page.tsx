import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPathwayPairs, getPathwayGenes } from "@/lib/gene/pathways/api";
import {
  PATHWAY_SOURCES,
  type PathwayData,
} from "@/lib/gene/pathways/constants";
import { NoDataState } from "@/components/ui/error-states";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { PathwaysDashboard } from "@/components/features/gene/pathways/pathways-dashboard";

interface PathwaysPageProps {
  params: {
    geneName: string;
  };
}

export async function generateMetadata({
  params,
}: PathwaysPageProps): Promise<Metadata> {
  return {
    title: `${params.geneName} - Pathways | FAVOR`,
    description: `Pathway analysis and protein-protein interactions for ${params.geneName}`,
  };
}

export default async function PathwaysPage({ params }: PathwaysPageProps) {
  const geneData = await fetchGeneAnnotation(params.geneName);
  if (!geneData) {
    notFound();
  }

  const pathwayData: PathwayData = {};
  let hasAnyData = false;

  const sourcePromises = Object.keys(PATHWAY_SOURCES).map(async (source) => {
    try {
      const sourceParam = source === "IntPath" ? "" : source;
      const interactionLimit = 100;

      const [interactions, genes] = await Promise.all([
        getPathwayPairs(params.geneName, interactionLimit, sourceParam),
        getPathwayGenes(params.geneName, sourceParam),
      ]);

      if (
        (interactions && interactions.length > 0) ||
        (genes && genes.length > 0)
      ) {
        pathwayData[source] = {
          interactions: interactions || [],
          genes: genes || [],
        };
        hasAnyData = true;
      }
    } catch (error) {
      console.warn(`Failed to fetch ${source} pathways:`, error);
    }
  });

  await Promise.all(sourcePromises);

  if (!hasAnyData) {
    return (
      <NoDataState
        categoryName="pathway data"
        title="No Pathway Data Available"
        description="No pathway information is available for this gene from any of our data sources."
      />
    );
  }

  return (
    <Suspense 
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      }
    >
      <PathwaysDashboard pathwayData={pathwayData} />
    </Suspense>
  );
}
