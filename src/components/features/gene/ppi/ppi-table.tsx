"use client";

import React, { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { createPPIColumns, createPPIFacetedFilters, type PPIInteraction } from "@/lib/gene/ppi/ppi-columns";

interface PPITableProps {
  data: PPIInteraction[];
  selectedNode?: string | null;
}

export function PPITable({ data, selectedNode }: PPITableProps) {
  const columns = useMemo(
    () => createPPIColumns(selectedNode ?? null),
    [selectedNode],
  );

  const facetedFilters = useMemo(() => {
    return createPPIFacetedFilters(data);
  }, [data]);

  const exportTSV = (filteredData: PPIInteraction[]) => {
    const headers = columns.map((col) => {
      if (typeof col.header === "string") return col.header;
      if ("accessorKey" in col && col.accessorKey)
        return col.accessorKey.toString();
      return "column";
    });

    const rows = filteredData.map((row) =>
      columns.map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = (row as any)[col.accessorKey];
          return typeof value === "string" ? value : String(value || "");
        }
        return "";
      }),
    );

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "protein-protein-interactions.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={columns}
      data={data}
      title="Protein-Protein Interactions"
      description="Direct protein-protein interactions from experimental evidence"
      searchPlaceholder="Search genes, methods, types..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="protein-protein-interactions.tsv"
      initialPageSize={10}
      emptyState={{
        title: "No interaction data available",
        description: "No interaction information is available.",
        dataType: "interactions",
      }}
      getRowId={(row) => row.id}
      selectedRowId={
        selectedNode
          ? data.find(
              (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
            )?.id ?? null
          : null
      }
    />
  );
}