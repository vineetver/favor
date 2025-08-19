"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { eqtlColumns } from "@/components/features/ccre/linked-genes/table-columns";
import type { Eqtl } from "@/components/features/ccre/linked-genes/types";

interface EqtlCardProps {
  accession: string;
  data: Eqtl[] | undefined;
  isLoading?: boolean;
}

export function EqtlCard({ accession, data, isLoading = false }: EqtlCardProps) {

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

  const exportData = (filteredData: Eqtl[]) => {
    const headers = ["Gene", "Type", "P-value", "Tissue", "Effect", "Source"];
    const rows = filteredData.map((row) => [
      row.gene_name,
      row.gene_type,
      row.p_value.toExponential(1),
      row.tissue,
      row.slope.toFixed(3),
      row.source,
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eqtl_links_${accession}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={eqtlColumns}
      data={sortedData}
      title={`eQTL Links (${data.length})`}
      showSearch={false}
      showColumnToggle={false}
      onExport={exportData}
      exportFilename={`eqtl_links_${accession}.tsv`}
      initialPageSize={6}
      isLoading={isLoading}
      emptyState={{
        title: "No eQTL links found",
        description: "No eQTL linkage data is available for this cCRE.",
        dataType: "eQTL data",
      }}
    />
  );
}