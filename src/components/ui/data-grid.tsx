"use client";

import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { NoDataState } from "@/components/ui/error-states";

interface DataGridProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  description?: string;
  searchKey?: keyof TData;
  searchPlaceholder?: string;
  facetedFilters?: Array<{
    columnId: string;
    title: string;
    options: Array<{
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }>;
  }>;
  onExport?: (data: TData[], filename?: string) => void;
  exportFilename?: string;
  initialPageSize?: number;
  showExport?: boolean;
  showColumnToggle?: boolean;
  showSearch?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    icon?: string;
    dataType?: string;
  };
}

export function DataGrid<TData, TValue>({
  columns,
  data,
  title,
  description,
  searchKey,
  searchPlaceholder = "Search...",
  facetedFilters = [],
  onExport,
  exportFilename = "data.csv",
  initialPageSize = 20,
  showExport = true,
  showColumnToggle = true,
  showSearch = true,
  emptyState,
}: DataGridProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
  });

  const handleExport = () => {
    if (onExport) {
      const filteredData = table.getFilteredRowModel().rows.map((row) => row.original);
      onExport(filteredData, exportFilename);
      return;
    }

    const headers = columns
      .filter((col) => col.header && typeof col.header === "string")
      .map((col) => col.header as string);
    
    const rows = table.getFilteredRowModel().rows.map((row) => 
      columns.map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = row.getValue(col.accessorKey as string);
          return value?.toString() || "";
        }
        return "";
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", exportFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <NoDataState
            title={emptyState?.title || "No data found"}
            description={emptyState?.description || "No data is available."}
            categoryName={emptyState?.dataType || "data"}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {(title || description || showSearch || showExport || showColumnToggle) && (
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="flex items-center space-x-2">
              {showExport && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              {showColumnToggle && <DataTableColumnToggle table={table} />}
            </div>
          </div>
          
          {(showSearch || facetedFilters.length > 0) && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              {showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {globalFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                      onClick={() => setGlobalFilter("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              
              {facetedFilters.length > 0 && (
                <div className="flex flex-wrap items-center space-x-2">
                  {facetedFilters.map((filter) => (
                    <DataTableFacetedFilter
                      key={filter.columnId}
                      column={table.getColumn(filter.columnId)}
                      title={filter.title}
                      options={filter.options}
                    />
                  ))}
                  {table.getState().columnFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => table.resetColumnFilters()}
                      className="h-8 px-2 lg:px-3"
                    >
                      Reset
                      <X className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>
      )}

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
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          
          <TablePagination table={table} />
      </CardContent>
    </Card>
  );
}