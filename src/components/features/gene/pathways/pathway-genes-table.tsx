"use client";

import React, { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import {
  createPathwayGenesColumns,
  createPathwayInteractionsColumns,
  createPathwayFacetedFilters,
  type PathwayGeneData,
  type PathwayInteractionData,
} from "@/lib/gene/pathways/columns";

interface PathwayGenesTableProps {
  data: (PathwayGeneData | PathwayInteractionData)[];
  type: "genes" | "interactions";
  highlightData?: {
    selectedPathway: string | null;
    selectedNode: string | null;
    pathwayGenes: string[];
    pathwayInteractions: any[];
  };
}

export function PathwayGenesTable({
  data,
  type,
  highlightData,
}: PathwayGenesTableProps) {
  const columns = useMemo(() => {
    if (type === "genes") {
      return createPathwayGenesColumns(highlightData);
    }
    return createPathwayInteractionsColumns(highlightData);
  }, [type, highlightData]);

  const facetedFilters = useMemo(() => {
    return createPathwayFacetedFilters(data, type);
  }, [data, type]);

  const exportTSV = (filteredData: typeof data) => {
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
    a.download = `pathway-${type}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={columns}
      data={data}
      title={`Pathway ${type === "genes" ? "Genes" : "Interactions"}`}
      description={
        type === "genes"
          ? "Genes associated with biological pathways"
          : "Protein-protein interactions within biological pathways"
      }
      searchPlaceholder="Search pathways or genes..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename={`pathway-${type}.tsv`}
      initialPageSize={10}
      emptyState={{
        title: `No ${type} data available`,
        description: `No ${type} information is available.`,
        dataType: type,
      }}
    />
  );
}
