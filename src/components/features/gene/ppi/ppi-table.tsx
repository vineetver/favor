"use client";

import React, { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import { NoDataFound, NoSearchResults } from "@/components/ui/no-data-found";
import { Search, Download, X } from "lucide-react";
import { cn } from "@/lib/utils/general";
import { useState } from "react";
import { useFilters, UniversalDataTableToolbar } from "@/components/ui/universal-filter";

interface PPIInteraction {
  id: string;
  gene_a: string;
  gene_b: string;
  method?: string;
  degree?: string;
  confidence?: number | undefined;
  source: string;
  publication?: string | undefined;
  interaction_type?: string;
}

interface PPITableProps {
  data: PPIInteraction[];
  selectedNode?: string | null;
}

export function PPITable({ data, selectedNode }: PPITableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const isRowHighlighted = (item: PPIInteraction) => {
    if (!selectedNode) return false;
    return item.gene_a === selectedNode || item.gene_b === selectedNode;
  };

  // Get unique values for filter options
  const uniqueMethods = useMemo(
    () =>
      Array.from(
        new Set(data.map((item) => item.method).filter(Boolean) as string[]),
      ).sort(),
    [data],
  );

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          data.map((item) => item.interaction_type).filter(Boolean) as string[],
        ),
      ).sort(),
    [data],
  );

  const filters = useMemo(() => [
    {
      id: 'search',
      type: 'search' as const,
      label: 'Search',
      placeholder: 'Search genes, methods, types...',
      searchFields: ['gene_a', 'gene_b', 'method', 'interaction_type']
    },
    ...(uniqueMethods.length > 0 ? [{
      id: 'method',
      type: 'select' as const,
      label: 'Method',
      options: uniqueMethods.map(method => ({ label: method, value: method }))
    }] : []),
    ...(uniqueTypes.length > 0 ? [{
      id: 'interaction_type',
      type: 'select' as const,
      label: 'Interaction Type',
      options: uniqueTypes.map(type => ({ label: type, value: type }))
    }] : [])
  ], [uniqueMethods, uniqueTypes]);

  const { filterValues, setFilterValues, filteredData } = useFilters({
    data,
    filters
  });

  const columns: ColumnDef<PPIInteraction>[] = useMemo(
    () => [
      {
        accessorKey: "gene_a",
        header: createColumnHeader("Gene A"),
        cell: ({ row, getValue }) => {
          const geneA = getValue() as string;
          const isHighlighted = isRowHighlighted(row.original);
          return (
            <code
              className={cn(
                "px-2 py-1 rounded text-sm",
                isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted",
              )}
            >
              {geneA}
            </code>
          );
        },
      },
      {
        accessorKey: "gene_b",
        header: createColumnHeader("Gene B"),
        cell: ({ row, getValue }) => {
          const geneB = getValue() as string;
          const isHighlighted = isRowHighlighted(row.original);
          return (
            <code
              className={cn(
                "px-2 py-1 rounded text-sm",
                isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted",
              )}
            >
              {geneB}
            </code>
          );
        },
      },
      {
        accessorKey: "method",
        header: createColumnHeader("Detection Method"),
        cell: ({ getValue }) => {
          const method = getValue() as string;
          return method ? (
            <Badge variant="outline" className="text-xs">
              {method}
            </Badge>
          ) : null;
        },
      },
      {
        accessorKey: "interaction_type",
        header: createColumnHeader("Interaction Type"),
        cell: ({ getValue }) => {
          const type = getValue() as string;
          return type ? (
            <Badge variant="secondary" className="text-xs">
              {type}
            </Badge>
          ) : null;
        },
      },
      {
        accessorKey: "confidence",
        header: createColumnHeader("Confidence"),
        cell: ({ getValue }) => {
          const confidence = getValue() as number | undefined;
          return confidence !== undefined &&
            confidence !== null &&
            typeof confidence === "number" ? (
            <span className="text-sm font-mono">{confidence.toFixed(3)}</span>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          );
        },
      },
      {
        accessorKey: "degree",
        header: createColumnHeader("Degree"),
        cell: ({ getValue }) => {
          const degree = getValue() as string;
          return degree ? (
            <Badge variant="outline" className="text-xs">
              {degree}
            </Badge>
          ) : null;
        },
      },
      {
        accessorKey: "publication",
        header: createColumnHeader("Publication"),
        cell: ({ getValue }) => {
          const publication = getValue() as string | undefined;
          return publication && publication.trim() ? (
            <span className="text-sm truncate max-w-32" title={publication}>
              {publication}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          );
        },
      },
    ],
    [selectedNode],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const exportTSV = () => {
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

  const hasData = data && data.length > 0;
  const hasFilteredData =
    hasData && table.getFilteredRowModel().rows.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-6">
          <NoDataFound
            title="No interaction data available"
            dataType="interactions"
            icon="database"
            className="py-8"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Protein-Protein Interactions</CardTitle>
          <CardDescription>
            Direct protein-protein interactions from experimental evidence
          </CardDescription>
        </div>

        <UniversalDataTableToolbar
          table={table}
          data={data}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={setFilterValues}
          onExport={exportTSV}
          exportLabel="Export TSV"
        />
      </CardHeader>

      <CardContent className="grid grid-cols-1">
        {hasFilteredData ? (
          <>
            <Table className="table-auto">
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
                {table.getRowModel().rows.map((row) => {
                  const isHighlighted = isRowHighlighted(row.original);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        isHighlighted &&
                          "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination table={table} />
          </>
        ) : (
          <div className="p-6">
            <NoSearchResults
              searchTerm={filterValues.search as string || ''}
              onClearSearch={() => setFilterValues({ ...filterValues, search: '' })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
