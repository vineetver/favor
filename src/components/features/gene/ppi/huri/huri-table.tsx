"use client";

import React, { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import type { HuriInteraction } from "@/lib/gene/ppi/constants";
import {
  createBasePPIColumns,
} from "@/lib/gene/ppi/table-utils";
import { transformHuriToUnified } from "../data-transforms";

interface HuriTableProps {
  data: HuriInteraction[];
  selectedNode?: string | null;
}

export function HuriTable({ data, selectedNode }: HuriTableProps) {
  const transformedData = useMemo(
    () => transformHuriToUnified(data, "HuRI"),
    [data],
  );

  const columns = useMemo(() => {
    const baseColumns = createBasePPIColumns(selectedNode ?? null);
    return baseColumns.filter((col) => {
      const accessorKey = "accessorKey" in col ? col.accessorKey : "";
      return accessorKey !== "confidence" && accessorKey !== "publication";
    });
  }, [selectedNode]);

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
    a.download = "huri-interactions.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={columns}
      data={transformedData}
      title="HuRI Protein-Protein Interactions"
      description="Human Reference Interactome - high-quality binary interactions via Yeast Two-Hybrid"
      searchPlaceholder="Search genes..."
      onExport={exportTSV}
      exportFilename="huri-interactions.tsv"
      initialPageSize={10}
      emptyState={{
        title: "No HuRI interaction data available",
        description: "No interaction information is available.",
        dataType: "interactions",
      }}
      getRowId={(row) => `${row.gene_a}-${row.gene_b}`}
      selectedRowId={
        selectedNode
          ? transformedData.find(
              (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
            )
              ? `${transformedData.find(
                  (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
                )?.gene_a}-${transformedData.find(
                  (row) => row.gene_a === selectedNode || row.gene_b === selectedNode,
                )?.gene_b}`
              : null
          : null
      }
    />
  );
}
