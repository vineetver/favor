import { notFound } from "next/navigation";
import {
  getBiogridInteractions,
  getIntactInteractions,
  getHuriInteractions,
} from "@/lib/gene/ppi/api";
import { NoDataState } from "@/components/ui/error-states";
import type {
  PPIData,
} from "@/lib/gene/ppi/constants";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { PPIDashboard } from "@/components/features/gene/ppi/ppi-dashboard";

interface PPIPageProps {
  params: {
    geneName: string;
  };
}


export default async function ProteinProteinInteractionsPage({
  params,
}: PPIPageProps) {
  const geneData = await fetchGeneAnnotation(params.geneName);
  if (!geneData) {
    notFound();
  }

  const ppiData: PPIData = {
    BioGRID: [],
    IntAct: [],
    HuRI: [],
  };
  let hasAnyData = false;

  const interactionLimit = 100;

  try {
    const [biogridData, intactData, huriData] = await Promise.all([
      getBiogridInteractions(params.geneName, interactionLimit),
      getIntactInteractions(params.geneName, interactionLimit),
      getHuriInteractions(params.geneName, interactionLimit),
    ]);

    if (biogridData && biogridData.length > 0) {
      ppiData.BioGRID = biogridData;
      hasAnyData = true;
    }

    if (intactData && intactData.length > 0) {
      ppiData.IntAct = intactData;
      hasAnyData = true;
    }

    if (huriData && huriData.length > 0) {
      ppiData.HuRI = huriData;
      hasAnyData = true;
    }
  } catch (error) {
    console.error("Error fetching PPI data:", error);
  }

  if (!hasAnyData) {
    return (
      <NoDataState categoryName="protein-protein interaction information" />
    );
  }

  return <PPIDashboard ppiData={ppiData} geneName={params.geneName} />;
}
