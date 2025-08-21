"use client";

import React, { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/pagination";
import { NoDataFound, NoSearchResults } from "@/components/ui/no-data-found";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils/general";
import { useFilters, UniversalDataTableToolbar } from "@/components/ui/universal-filter";
import type { BiogridInteraction } from "@/lib/gene/ppi/constants";
import type { BiogridProcessedInteraction } from "@/components/features/gene/ppi/biogrid/biogrid-types";
import {
  transformBiogridData,
  getBiogridUniqueValues,
} from "@/components/features/gene/ppi/biogrid/biogrid-transforms";
import {
  createBiogridColumns,
  exportBiogridTableData,
  filterBiogridTableData,
} from "@/components/features/gene/ppi/biogrid/biogrid-columns";

interface BiogridTableProps {
  data: BiogridInteraction[];
  selectedNode?: string | null;
}

export function BiogridTable({ data, selectedNode }: BiogridTableProps) {
  const transformedData = useMemo(() => transformBiogridData(data), [data]);

  const columns = useMemo(
    () => createBiogridColumns(selectedNode ?? null),
    [selectedNode],
  );

  const facetedFilters = useMemo(() => {
    return createBiogridFacetedFilters(transformedData);
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
    a.download = "biogrid-interactions.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={columns}
      data={transformedData}
      title="BioGRID Protein-Protein Interactions"
      description="Biological General Repository for Interaction Datasets - curated experimental interactions"
      searchPlaceholder="Search genes, methods, types..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="biogrid-interactions.tsv"
      initialPageSize={10}
      emptyState={{
        title: "No BioGRID interaction data available",
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
