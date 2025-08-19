"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { crisprColumns } from "@/components/features/ccre/linked-genes/table-columns";
import type { Crispr } from "@/components/features/ccre/linked-genes/types";

interface CrisprCardProps {
  accession: string;
  data: Crispr[] | undefined;
  isLoading?: boolean;
}

export function CrisprCard({ accession, data, isLoading = false }: CrisprCardProps) {

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => a.p_value - b.p_value);
  }, [data]);

  const uniqueGenes = useMemo(() => {
    if (!sortedData) return 0;
    return new Set(sortedData.map((item) => item.gene_name)).size;
  }, [sortedData]);

  const medianPValue = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return 0;
    const pValues = sortedData
      .map((item) => item.p_value)
      .sort((a, b) => a - b);
    const mid = Math.floor(pValues.length / 2);
    return pValues.length % 2 !== 0
      ? pValues[mid]
      : (pValues[mid - 1] + pValues[mid]) / 2;
  }, [sortedData]);

  if (!data || data.length === 0) {
    return null;
  }

  const exportData = (filteredData: Crispr[]) => {
    const headers = ["Gene", "Type", "P-value", "Assay", "Biosample", "Effect", "gRNA"];
    const rows = filteredData.map((row) => [
      row.gene_name,
      row.gene_type,
      row.p_value.toExponential(1),
      row.assay_type,
      row.biosample,
      row.effect_size,
      row.grna_id,
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crispr_links_${accession}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={crisprColumns}
      data={sortedData}
      title={`CRISPR Links (${data.length})`}
      description={`${data.length} links · ${uniqueGenes} unique genes · median p-value ${medianPValue.toExponential(1)}`}
      showSearch={false}
      showColumnToggle={false}
      onExport={exportData}
      exportFilename={`crispr_links_${accession}.tsv`}
      initialPageSize={6}
      isLoading={isLoading}
      emptyState={{
        title: "No CRISPR links found",
        description: "No CRISPR linkage data is available for this cCRE.",
        dataType: "CRISPR data",
      }}
    />
  );
}