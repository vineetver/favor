"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { scentColumns } from "@/lib/variant/scent/table-columns";
import type { ScentTissue } from "@/lib/variant/scent/types";

type ScentTableProps = {
  data: ScentTissue[];
  title: string;
  description: string;
  isLoading?: boolean;
};

export function ScentTable({ data, title, description, isLoading = false }: ScentTableProps) {
  const exportData = (data: ScentTissue[]) => {
    const headers = [
      "SCENT Region",
      "Associated Gene", 
      "Tissue",
      "Sub Tissue"
    ];

    const rows = data.map((row) => [
      row.region || "N/A",
      row.gene || "N/A",
      row.tissue || "N/A",
      row.sub_tissue || "N/A"
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scent_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters = useMemo(() => [
    {
      columnId: "tissue",
      title: "Tissue Type",
      options: Array.from(new Set(data.map(item => item.tissue)))
        .filter(Boolean)
        .map(tissue => ({ label: tissue, value: tissue })),
      filterFn: (row: ScentTissue, _columnId: string, value: string) => {
        return row.tissue === value;
      }
    }
  ], [data]);

  return (
    <DataGrid
      columns={scentColumns}
      data={data}
      title={title}
      description={description}
      searchPlaceholder="Search regions, genes..."
      facetedFilters={facetedFilters}
      onExport={exportData}
      exportFilename={`scent_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`}
      initialPageSize={25}
      isLoading={isLoading}
      emptyState={{
        title: "No SCENT Data",
        description: "No SCENT tissue-specific regulatory data available for this variant.",
        dataType: "SCENT Data"
      }}
    />
  );
}
