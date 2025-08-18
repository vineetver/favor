"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/pagination";
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import { NoDataFound } from "@/components/ui/no-data-found";
import { Download } from "lucide-react";

interface AncestryFrequency {
  population_code: string;
  name: string;
  g1000: number | undefined;
  gnomad31: number | undefined;
  gnomad41_exome: number | undefined;
  gnomad41_genome: number | undefined;
}

interface AncestryFrequencyTableProps {
  data: AncestryFrequency[];
}

const formatFrequency = (value: number | undefined): string => {
  if (value === undefined || value === null) return "N/A";
  if (value === 0) return "0";
  return value.toExponential(3);
};

const ancestryColumns: ColumnDef<AncestryFrequency>[] = [
  {
    accessorKey: "name",
    header: createColumnHeader("Population"),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "g1000",
    header: createColumnHeader("1000G Phase 3", {
      tooltip: "Allele frequency from 1000 Genomes Phase 3",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-blue-600">
        {formatFrequency(row.getValue("g1000"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad31",
    header: createColumnHeader("gnomAD v3.1", {
      tooltip: "Allele frequency from gnomAD v3.1 database",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-green-600">
        {formatFrequency(row.getValue("gnomad31"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad41_exome",
    header: createColumnHeader("gnomAD v4.1 Exome", {
      tooltip: "Allele frequency from gnomAD v4.1 Exome dataset",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-purple-600">
        {formatFrequency(row.getValue("gnomad41_exome"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad41_genome",
    header: createColumnHeader("gnomAD v4.1 Genome", {
      tooltip: "Allele frequency from gnomAD v4.1 Genome dataset",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-orange-600">
        {formatFrequency(row.getValue("gnomad41_genome"))}
      </div>
    ),
  },
];

export function AncestryFrequencyTable({ data }: AncestryFrequencyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns: ancestryColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const exportTSV = () => {
    const headers = ancestryColumns.map((col) => {
      if (typeof col.header === "string") return col.header;
      if ("accessorKey" in col && col.accessorKey)
        return col.accessorKey.toString();
      return "column";
    });

    const rows = data.map((row) => [
      row.name,
      formatFrequency(row.g1000),
      formatFrequency(row.gnomad31),
      formatFrequency(row.gnomad41_exome),
      formatFrequency(row.gnomad41_genome),
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ancestry_allele_frequencies.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <NoDataFound
            title="No frequency data"
            description="No ancestry-specific frequency data is available."
            icon="database"
            dataType="frequency data"
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pl-2">
          <div>
            <CardTitle className="text-lg">Ancestry Allele Frequencies</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={exportTSV}>
            <Download className="h-4 w-4 mr-1" />
            Export TSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-muted/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination table={table} />
      </CardContent>
    </Card>
  );
}

export type { AncestryFrequency };
