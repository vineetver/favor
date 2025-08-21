"use client";

import React, { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import type { IntactInteraction } from "@/lib/gene/ppi/constants";
import { transformIntactData } from "./intact-transforms";
import {
  createIntactColumns,
  createIntactFacetedFilters,
} from "./intact-columns";

interface IntactTableProps {
  data: IntactInteraction[];
  selectedNode?: string | null;
}

export function IntactTable({ data, selectedNode }: IntactTableProps) {
  const transformedData = useMemo(() => transformIntactData(data), [data]);

  const columns = useMemo(
    () => createIntactColumns(selectedNode ?? null),
    [selectedNode],
  );

  const facetedFilters = useMemo(() => {
    return createIntactFacetedFilters(transformedData);
  }, [transformedData]);

  const exportTSV = (filteredData: typeof transformedData) => {
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
    a.download = "intact-interactions.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={columns}
      data={transformedData}
      title="IntAct Protein-Protein Interactions"
      description="Molecular interaction database - literature-curated and direct submissions"
      searchPlaceholder="Search genes, methods, types..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="intact-interactions.tsv"
      initialPageSize={10}
      emptyState={{
        title: "No IntAct interaction data available",
        description: "No interaction information is available.",
        dataType: "interactions",
      }}
      getRowId={(row) => `${row.gene_a}-${row.gene_b}-${row.method}`}
      selectedRowId={
        selectedNode
          ? transformedData.find(
              (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
            )
              ? `${transformedData.find(
                  (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
                )?.gene_a}-${transformedData.find(
                  (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
                )?.gene_b}-${transformedData.find(
                  (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
                )?.method}`
              : null
          : null
      }
    />
  );
}
