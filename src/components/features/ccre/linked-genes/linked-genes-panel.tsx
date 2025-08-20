"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { EqtlCard } from "@/components/features/ccre/linked-genes/eqtl-card";
import { RNAPIIChiapetCard } from "@/components/features/ccre/linked-genes/rnapii-chiapet-card";
import { IntactHicCard } from "@/components/features/ccre/linked-genes/intact-hic-card";
import { CrisprCard } from "@/components/features/ccre/linked-genes/crispr-card";
import {
  EQTL_URL,
  CHIA_PET_URL,
  CRISPR_URL,
  type Eqtl,
  type Chiapet,
  type Crispr,
} from "@/components/features/ccre/linked-genes/types";

interface LinkedGenesPanelProps {
  accession: string;
}

export function LinkedGenesPanel({ accession }: LinkedGenesPanelProps) {
  const { data: eqtlData, isLoading: isEqtlLoading } = useQuery({
    queryKey: ["eqtl", accession],
    queryFn: async () => {
      const response = await fetch(`${EQTL_URL}/${accession}`);
      if (!response.ok) return [];
      return response.json() as Promise<Eqtl[]>;
    },
    enabled: Boolean(accession),
  });

  const { data: chiapetData, isLoading: isChiapetLoading } = useQuery({
    queryKey: ["chiapet", accession],
    queryFn: async () => {
      const response = await fetch(`${CHIA_PET_URL}/${accession}`);
      if (!response.ok) return [];
      return response.json() as Promise<Chiapet[]>;
    },
    enabled: Boolean(accession),
  });

  const { data: crisprData, isLoading: isCrisprLoading } = useQuery({
    queryKey: ["crispr", accession],
    queryFn: async () => {
      const response = await fetch(`${CRISPR_URL}/${accession}`);
      if (!response.ok) return [];
      return response.json() as Promise<Crispr[]>;
    },
    enabled: Boolean(accession),
  });

  const { rnapiiData, intactHicData } = useMemo(() => {
    if (!chiapetData) return { rnapiiData: [], intactHicData: [] };

    const rnapii: Chiapet[] = [];
    const intactHic: Chiapet[] = [];

    // Single pass filtering for performance
    chiapetData.forEach((item) => {
      if (item.assay_type === "RNAPII-ChIAPET") {
        rnapii.push(item);
      } else if (item.assay_type === "Intact-HiC") {
        intactHic.push(item);
      }
    });

    return { rnapiiData: rnapii, intactHicData: intactHic };
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
