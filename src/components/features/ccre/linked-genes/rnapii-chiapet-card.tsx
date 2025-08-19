"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { chiapetColumns } from "@/components/features/ccre/linked-genes/table-columns";
import type { Chiapet } from "@/components/features/ccre/linked-genes/types";

interface RNAPIIChiapetCardProps {
  accession: string;
  data: Chiapet[];
  isLoading?: boolean;
}

export function RNAPIIChiapetCard({ accession, data, isLoading = false }: RNAPIIChiapetCardProps) {

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const scoreA = parseFloat(a.score) || 0;
      const scoreB = parseFloat(b.score) || 0;
      return scoreB - scoreA;
    });
  }, [data]);

  const uniqueGenes = useMemo(() => {
    if (!sortedData) return 0;
    return new Set(sortedData.map((item) => item.gene_name)).size;
  }, [sortedData]);

  const medianScore = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return 0;
    const scores = sortedData
      .map((item) => parseFloat(item.score) || 0)
      .sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0
      ? scores[mid]
      : (scores[mid - 1] + scores[mid]) / 2;
  }, [sortedData]);

  if (!data || data.length === 0) {
    return null;
  }

  const exportData = (filteredData: Chiapet[]) => {
    const headers = ["Gene", "Type", "Score", "Biosample", "P-value", "Experiment"];
    const rows = filteredData.map((row) => [
      row.gene_name,
      row.gene_type,
      parseFloat(row.score).toFixed(1),
      row.biosample,
      row.p_value,
      row.experiment_id,
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rnapii_chiapet_links_${accession}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={chiapetColumns}
      data={sortedData}
      title={`RNAPII ChIA-PET Links (${data.length})`}
      description={`${data.length} links · ${uniqueGenes} unique genes · median score ${medianScore.toFixed(1)}`}
      showSearch={false}
      showColumnToggle={false}
      onExport={exportData}
      exportFilename={`rnapii_chiapet_links_${accession}.tsv`}
      initialPageSize={6}
      isLoading={isLoading}
      emptyState={{
        title: "No RNAPII ChIA-PET links found",
        description: "No RNAPII ChIA-PET linkage data is available for this cCRE.",
        dataType: "ChIA-PET data",
      }}
    />
  );
}