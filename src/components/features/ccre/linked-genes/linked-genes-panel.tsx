"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { EqtlCard } from "@/components/features/ccre/linked-genes/eqtl-card";
import { RNAPIIChiapetCard } from "@/components/features/ccre/linked-genes/rnapii-chiapet-card";
import { IntactHicCard } from "@/components/features/ccre/linked-genes/intact-hic-card";
import { CrisprCard } from "@/components/features/ccre/linked-genes/crispr-card";
import { fetchEQTL, fetchChiaPet, fetchCRISPR, separateChiaPetData } from "./api";

interface LinkedGenesPanelProps {
  accession: string;
}

export function LinkedGenesPanel({ accession }: LinkedGenesPanelProps) {
  const { data: eqtlData, isLoading: isEqtlLoading } = useQuery({
    queryKey: ["eqtl", accession],
    queryFn: () => fetchEQTL(accession),
    enabled: Boolean(accession),
  });

  const { data: chiapetData, isLoading: isChiapetLoading } = useQuery({
    queryKey: ["chiapet", accession],
    queryFn: () => fetchChiaPet(accession),
    enabled: Boolean(accession),
  });

  const { data: crisprData, isLoading: isCrisprLoading } = useQuery({
    queryKey: ["crispr", accession],
    queryFn: () => fetchCRISPR(accession),
    enabled: Boolean(accession),
  });

  const { rnapiiData, intactHicData } = useMemo(() => {
    if (!chiapetData) return { rnapiiData: [], intactHicData: [] };
    return {
      rnapiiData: separateChiaPetData(chiapetData).rnapii,
      intactHicData: separateChiaPetData(chiapetData).intactHic,
    };
  }, [chiapetData]);

  const hasEqtl = eqtlData && eqtlData.length > 0;
  const hasRnapii = rnapiiData.length > 0;
  const hasIntactHic = intactHicData.length > 0;
  const hasCrispr = crisprData && crisprData.length > 0;

  const isAnyLoading = isEqtlLoading || isChiapetLoading || isCrisprLoading;
  const hasAnyData = hasEqtl || hasRnapii || hasIntactHic || hasCrispr;
  const showEqtl = hasEqtl || isEqtlLoading;
  const showRnapii = hasRnapii || isChiapetLoading;
  const showIntactHic = hasIntactHic || isChiapetLoading;
  const showCrispr = hasCrispr || isCrisprLoading;

  // Show loading or no data state
  if (!hasAnyData && !isAnyLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No linked genes data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showEqtl && (
        <EqtlCard
          accession={accession}
          data={eqtlData}
          isLoading={isEqtlLoading}
        />
      )}
      {showRnapii && (
        <RNAPIIChiapetCard
          accession={accession}
          data={rnapiiData}
          isLoading={isChiapetLoading}
        />
      )}
      {showIntactHic && (
        <IntactHicCard
          accession={accession}
          data={intactHicData}
          isLoading={isChiapetLoading}
        />
      )}
      {showCrispr && (
        <CrisprCard
          accession={accession}
          data={crisprData}
          isLoading={isCrisprLoading}
        />
      )}
    </div>
  );
}
